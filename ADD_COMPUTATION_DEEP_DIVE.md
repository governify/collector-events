# `addComputation` Deep Dive

## 1. Objetivo del endpoint

`POST /api/v2/computations` (`operationId: addComputation`) crea una **solicitud asíncrona** de cálculo de métrica.

El flujo funcional real es:

1. El POST valida y encola cálculo.
2. Responde inmediatamente con `200` y una URL de consulta (`/api/v2/computations/{id}`).
3. El cliente hace polling a `GET /api/v2/computations/{id}` hasta que deje de devolver `202`.

Nota importante: en OpenAPI aparece `201`, pero la implementación actual devuelve `200`.

---

## 2. Contrato de entrada (DSL)

Estructura base:

```json
{
  "metric": {
    "computing": "string",
    "element": "number | {value|percentage|count|stdev}",
    "event": {},
    "scope": {
      "project": "projectId",
      "class": "classId",
      "member": "* (opcional)"
    },
    "window": {
      "initial": "ISO8601",
      "period": "fiveMinutes|hourly|daily|weekly|biweekly|monthly|bimonthly|annually|customRuleDaily",
      "type": "static (normalmente)",
      "end": "ISO8601",
      "rule": "RRULE/DTSTART (solo customRuleDaily)"
    },
    "offset": 0
  },
  "config": {
    "scopeManager": "http://.../api/v1/scopes/{scopeClassRoot}"
  }
}
```

### Campos y comportamiento real

- `metric.computing`: hoy **no participa** en el cálculo (se transporta, pero no decide lógica).
- `metric.event`: solo se procesa el **primer root key** (`Object.keys(...)[0]`).
- `metric.scope.member`:
  - sin valor: cálculo agregado normal.
  - `*`: cálculo por cada miembro de `scope.members` devuelto por Scope Manager.
- `metric.window.initial/end`: deben ser ISO 8601 y `end >= initial`.
- `metric.offset` (entero): desplaza `from/to` de cada período en días.
- `metric.element.value.traceback=true`: fuerza `from = 2016-01-01T00:00:00Z` en cada período.

---

## 3. Variantes de `metric.element` (núcleo de cálculo)

## 3.1 `number`

### Descripción avanzada

`number` es la variante más directa: convierte el conjunto de eventos principales en una cardinalidad.

Semántica exacta:

- Entrada lógica: `mainEvents` (resultado de `getEventsFromJson` para `metric.event`).
- Cálculo: `metric = mainEvents.length`.
- Dominio: entero `>= 0`.
- Evidencias devueltas: la colección completa `mainEvents`.

Propiedades funcionales:

- Es sensible a todos los filtros previos (`from/to`, `mustMatch`, sustituciones `%...%`).
- Con `scope.member="*"` se ejecuta por miembro y por período (producto cartesiano).
- No hay transformación adicional de eventos: lo que entra como evidencia es lo que se cuenta.

Complejidad local (sin contar I/O externo): `O(n)` por período-miembro, donde `n` es el número de eventos principales.

Ejemplo:

```json
{
  "metric": {
    "computing": "string",
    "element": "number",
    "event": { "github": { "allPR": {} } },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2020-06-07T12:00:00Z",
      "period": "monthly",
      "type": "static",
      "end": "2020-07-05T14:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

## 3.2 `value`

### Descripción avanzada

`value` proyecta cada evento a un valor escalar usando una ruta (`parameter`) y después aplica una función de agregación (`return`).

Semántica exacta:

- Extracción: para cada evento recorre `parameter` por notación punto (`a.b.c`).
- Valores no extraíbles (`undefined` o error de navegación): se registran por log y se excluyen del vector `values`.
- Agregadores soportados:
  - `avg`: media aritmética.
  - `max`: máximo.
  - `min`: mínimo.
  - `newest`: primer valor del array.
  - `oldest`: último valor del array.

Orden y efecto:

- El orden depende del fetcher; por defecto los eventos suelen venir ordenados de más nuevo a más antiguo tras `applyFilters`.
- Por eso `newest` y `oldest` son operadores de posición, no de timestamp recalculado en este paso.

Casos límite:

- `values.length === 0`:
  - con `traceback=true`: `metric = 0`.
  - sin `traceback`: `metric = NaN`.
- Si el resultado es `NaN`, esa computación no se incorpora al array final de salida.
- `traceback=true` además altera el rango temporal aguas arriba (`from` fijo a `2016-01-01T00:00:00Z`).

Complejidad local: `O(n * d)`, donde `n` es el número de eventos y `d` la profundidad de `parameter`.

Ejemplo:

```json
{
  "metric": {
    "computing": "string",
    "element": {
      "value": {
        "parameter": "attributes.covered_percent",
        "return": "min"
      }
    },
    "event": {
      "codeclimate": {
        "coverage": {
          "attributes": {
            "covered_percent": "%LOWER_OR_EQUAL%60"
          }
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2020-06-07T12:00:00Z",
      "period": "monthly",
      "type": "static",
      "end": "2020-07-05T14:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

Ejemplo con traceback:

```json
{
  "metric": {
    "computing": "string",
    "element": {
      "value": {
        "parameter": "additions",
        "return": "newest",
        "traceback": true
      }
    },
    "event": {
      "github": {
        "closedPRFiles": {
          "base": { "label": "%GITHUB.REPO_OWNER%:master" }
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2020-01-29T12:52:00Z",
      "period": "daily",
      "type": "static",
      "end": "2020-01-29T14:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

## 3.3 `percentage`

### Descripción avanzada

`percentage` implementa un ratio de emparejamiento entre eventos principales y secundarios mediante `related`.

Fórmula:

```text
percentage = (matches / mainEvents.length) * 100
```

Pipeline interno:

1. Obtiene `mainEvents` desde `metric.event`.
2. Obtiene `secondaryEvents` desde `element.percentage.related.<source>`.
3. Busca correspondencias 1 a 1 con `findMatches` (emparejamiento recursivo).
4. Devuelve:
   - `metric`: ratio en porcentaje.
   - `evidences`: pares `[mainEvent, secondaryEvent]` que hicieron match.

Reglas de matching:

- Ventana temporal:
  - para recuperar secundarios, usa `related.window` o por defecto 4 años (en segundos).
  - para validar match, usa `related.window` o por defecto 10 años.
- Binding bidireccional:
  - `matchBinding(main, secondary, secondaryDSL)` y
  - `matchBinding(secondary, main, mainDSL)`.
- Operadores de binding soportados: `#EQUALS#`, `#CONTAINS#`, `#CONTAINED#`.

Casos límite:

- Si `mainEvents.length === 0`, el cálculo deriva en `NaN` y la computación se descarta.
- El algoritmo de matching es codicioso/recursivo, no optimización global tipo Hungarian.

Complejidad aproximada: peor caso cercano a `O(m * n * min(m, n))` por período-miembro.

Ejemplo:

```json
{
  "metric": {
    "computing": "string",
    "element": {
      "percentage": {
        "related": {
          "github": {
            "mergedPR": {
              "user": {
                "login": "#EQUALS#(owner_ids.0)"
              }
            }
          },
          "window": 86400
        }
      }
    },
    "event": {
      "pivotal": {
        "activity": {
          "highlight": "finished"
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2020-01-21T12:00:00.000Z",
      "period": "daily",
      "type": "static",
      "end": "2020-01-22T12:00:00.000Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

## 3.4 `count`

### Descripción avanzada

`count` reutiliza el mismo mecanismo `related` de `percentage`, pero la métrica no normaliza por el total principal.

Fórmula:

```text
count = matches
```

Diferencia clave frente a `percentage`:

- `percentage` escala por `mainEvents.length`.
- `count` entrega volumen absoluto de correspondencias.

Reglas y evidencias:

- Misma estrategia de matching 1 a 1 y mismos operadores de binding.
- Misma forma de evidencias: pares `[mainEvent, secondaryEvent]`.

Caso límite específico:

- Si `mainEvents.length === 0`, el código fuerza `metric = NaN` (aunque `matches` sea 0), por lo que el período no aparece en salida.

Ejemplo:

```json
{
  "metric": {
    "computing": "string",
    "element": {
      "count": {
        "related": {
          "github": {
            "mergedPR": {
              "user": {
                "login": "#EQUALS#(owner_ids.0)"
              }
            }
          }
        }
      }
    },
    "event": {
      "pivotal": {
        "activity": {
          "highlight": "finished"
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2020-01-21T12:00:00.000Z",
      "period": "daily",
      "type": "static",
      "end": "2020-01-22T12:00:00.000Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

## 3.5 `stdev`

### Descripción avanzada

`stdev` mide dispersión temporal de los eventos principales dentro del período consultado.

Modelo de cálculo:

1. Construye fronteras internas con `metric.element.stdev.period`:
   - `hourly|daily|weekly|biweekly|monthly|bimonthly`.
2. Cuenta cuántos eventos caen en cada bucket.
3. Calcula desviación estándar poblacional sobre ese vector de frecuencias.

Fórmulas:

```text
mean = sum(bucketCounts) / bucketCounts.length
variance = sum((bucketCount - mean)^2) / bucketCounts.length
stdev = sqrt(variance)
```

Detalles importantes:

- Es desviación poblacional (`/n`), no muestral (`/(n-1)`).
- Si no hay eventos, el vector queda en ceros y el resultado es `0`.
- Las evidencias se mantienen como `mainEvents` completos; no se devuelven buckets.
- La pertenencia a bucket depende del `payloadDate` configurado para cada endpoint.

Complejidad local: `O(e * b)`, con `e` eventos y `b` fronteras internas.

Ejemplo:

```json
{
  "metric": {
    "computing": "string",
    "element": {
      "stdev": { "period": "daily" }
    },
    "event": {
      "github": {
        "closedPR": {
          "base": { "label": "%GITHUB.REPO_OWNER%:master" }
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2020-01-01T00:00:00Z",
      "period": "annually",
      "type": "static",
      "end": "2020-06-01T00:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

## 3.6 Nuevas variantes propuestas de `metric.element`

Estas variantes están pensadas para extender `getMetricAndEvidences` sin romper el DSL actual (mismo patrón: `metric.element = { <tipo>: {...} }`).

### 3.6.1 `sum`

Objetivo: suma acumulada de un parámetro numérico.

Fórmula:

```text
sum = Σ value_i
```

DSL propuesto:

```json
{
  "element": {
    "sum": {
      "parameter": "additions"
    }
  }
}
```

Caso límite recomendado: si no hay valores, devolver `0`.

### 3.6.2 `median`

Objetivo: robustez ante outliers frente a `avg`.

Fórmula:

```text
median = valor central de values ordenados
```

DSL propuesto:

```json
{
  "element": {
    "median": {
      "parameter": "attributes.covered_percent"
    }
  }
}
```

Caso límite recomendado: si no hay valores, devolver `NaN` (o `0` con `traceback=true` para mantener coherencia con `value`).

### 3.6.3 `percentile`

Objetivo: métricas tipo SLO/SLA (p90, p95, p99).

Fórmula:

```text
percentile(p) = valor en la posición p del vector ordenado
```

DSL propuesto:

```json
{
  "element": {
    "percentile": {
      "parameter": "duration_ms",
      "p": 95
    }
  }
}
```

Validación recomendada: `p` en `[0,100]`.

### 3.6.4 `rate`

Objetivo: tasa de eventos por unidad temporal, comparable entre ventanas.

Fórmula:

```text
rate = eventos / duración
```

DSL propuesto:

```json
{
  "element": {
    "rate": {
      "unit": "day"
    }
  }
}
```

Ejemplo: media de commits diarios durante 1 semana.

Semántica sugerida: usar `mainEvents.length` y normalizar por `window` (`hour|day|week`).

### 3.6.6 `trend`

Objetivo: medir dirección de evolución temporal (sube/baja/estable).

Modelo:

- divide la ventana en subperíodos.
- calcula conteos por subperíodo.
- aplica pendiente lineal simple.

DSL propuesto:

```json
{
  "element": {
    "trend": {
      "period": "weekly",
      "metric": "number"
    }
  }
}
```

Salida esperada: valor de pendiente (positivo, negativo o cercano a 0).

### 3.6.7 `uniqueCount`

Objetivo: contar entidades únicas (autores, issues, branches, etc.).

Fórmula:

```text
uniqueCount = |set(parameter_i)|
```

DSL propuesto:

```json
{
  "element": {
    "uniqueCount": {
      "parameter": "user.login"
    }
  }
}
```

Beneficio: evita sobreconteo por repetición de la misma entidad.

### 3.6.8 `weightedValue`

Objetivo: agregación ponderada para priorizar eventos críticos.

Fórmula:

```text
weightedAvg = Σ(value_i * weight_i) / Σ(weight_i)
```

DSL propuesto:

```json
{
  "element": {
    "weightedValue": {
      "valueParameter": "lead_time_days",
      "weightParameter": "story_points",
      "return": "avg"
    }
  }
}
```

Caso límite recomendado: `Σ(weight_i)=0` -> `NaN`.

### Priorización recomendada de implementación

1. `sum`, `median`, `percentile`, `uniqueCount` (rápidas y de alto valor).
2. `rate`, `ratio` (requieren control claro de unidades y denominador).
3. `trend`, `weightedValue` (más potentes, mayor complejidad y validación).

### Comparativa rápida de tipos

- `number`: volumen bruto de eventos principales.
- `value`: agregación de atributo numérico/eventual por evento.
- `percentage`: proporción de principales con match secundario.
- `count`: cantidad absoluta de matches principal-secundario.
- `stdev`: irregularidad temporal de ocurrencia de eventos.

---

## 4. Variantes de `metric.event`

## 4.1 Fuentes soportadas por `sourcesManager.json`

- `github`: `events`, `mergedPR`, `closedPR`, `openPR`, `allPR`
- `githubCI`: `builds`
- `gitlab`: `events`, `mergedMR`, `closedMR`, `allMR`, `newBranches`, `newBranchesAllRepos`, `updatedBranches`, `branchesUpdateRatioAllRepos`, `closedBranches`, `closedBranchesAllRepos`, `commits`, `releases`
- `ghwrapper`: `events`
- `pivotal`: `activity`, `stories`
- `heroku`: `releases`, `builds`
- `travis`: `builds_public`, `builds_private`
- `codeclimate`: `coverage`
- `redmine`: `newIssues`, `inProgressIssues30Days`, `updatedIssues`, `inProgressIssuesByMember`, `issuesMovedToInProgress`, `inProgressIssuesClosed`, `closedIssues`, `closedIssues30Days`, `closedIssuesOnePoint5Days`
- `jira`: `newIssues`, `updatedIssues`, `issuesByAssigneeAndStatus`, `issuesDevelByAssigneeAndStatus`, `closedIssuesByAssigneeAndStatus`
- `gitea`: `commits`, `allPR`, `PRs`, `branchesLastCommit`, `newBranches`, `allBranches`

## 4.2 Endpoint `custom`

Si el endpointType es `custom`, el flujo no usa `sourcesManager.getEndpoint`, sino switch por `custom.type`:

- `graphQL`
- `zenhub`
- `githubGQLV2`

Ejemplo real (GraphQL + miembro):

```json
{
  "metric": {
    "computing": "string",
    "element": "number",
    "event": {
      "githubGQL": {
        "custom": {
          "type": "graphQL",
          "steps": {
            "0": {
              "type": "queryGetObject",
              "query": "{repository(name: \"%PROJECT.github.repository%\", owner: \"%PROJECT.github.repoOwner%\") {projects(first: 1) {nodes {name}}}}"
            },
            "1": {
              "type": "objectGetSubObjects",
              "location": "data.repository.projects.nodes"
            }
          }
        }
      }
    },
    "scope": {
      "project": "testing-GH-governifyauditor_testing-goldenflow",
      "class": "testing",
      "member": "*"
    },
    "window": {
      "initial": "2021-01-20T00:00:00Z",
      "period": "annually",
      "type": "static",
      "end": "2021-02-19T00:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

Ejemplo `custom.type = zenhub`:

```json
{
  "metric": {
    "computing": "string",
    "element": "number",
    "event": {
      "zenhub": {
        "custom": {
          "type": "zenhub",
          "metric": "issuesByPipeline",
          "filters": { "pipelineName": "Doing" }
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2024-01-01T00:00:00Z",
      "period": "monthly",
      "type": "static",
      "end": "2024-02-01T00:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

Ejemplo `custom.type = githubGQLV2`:

```json
{
  "metric": {
    "computing": "string",
    "element": "number",
    "event": {
      "github": {
        "custom": {
          "type": "githubGQLV2",
          "metric": "pullRequests",
          "filters": { "state": "MERGED" }
        }
      }
    },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2024-01-01T00:00:00Z",
      "period": "monthly",
      "type": "static",
      "end": "2024-02-01T00:00:00Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

---

## 5. Variantes de ventana temporal (`metric.window`)

## 5.1 Períodos estándar

`fiveMinutes | hourly | daily | weekly | biweekly | monthly | bimonthly | annually`

Se trocea `[initial, end]` en tramos consecutivos y cada tramo genera una computación potencial.

## 5.2 `customRuleDaily`

Usa `metric.window.rule` (RRULE):

- genera días por `rrulestr(rule).all()`
- por cada día crea `from=00:00:00` y `to=23:59:59` UTC
- no añade días futuros (`if day > now break`)

Ejemplo de body:

```json
{
  "metric": {
    "computing": "string",
    "element": "number",
    "event": { "github": { "allPR": {} } },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2024-01-01T00:00:00Z",
      "period": "customRuleDaily",
      "type": "static",
      "end": "2024-01-31T23:59:59Z",
      "rule": "DTSTART:20240101T000000Z\nRRULE:FREQ=DAILY;UNTIL=20240110T000000Z"
    }
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

## 5.3 `offset` (desplazamiento de ventana)

`metric.offset` desplaza en días los `from/to` usados para consultar eventos, pero conserva `period.originalFrom/originalTo` como período reportado.

Ejemplo:

```json
{
  "metric": {
    "computing": "string",
    "element": "number",
    "event": { "github": { "allPR": {} } },
    "scope": { "project": "2242320", "class": "CS169" },
    "window": {
      "initial": "2024-01-01T00:00:00Z",
      "period": "weekly",
      "type": "static",
      "end": "2024-01-29T00:00:00Z"
    },
    "offset": -7
  },
  "config": {
    "scopeManager": "http://scopemanager.domain/api/v1/scopes/development"
  }
}
```

---

## 6. Flujo completo de ejecución (lógico y funcional)

## 6.1 POST `/api/v2/computations`

1. Lee `dsl = req.metric.value`.
2. Valida fechas (`validateInput`):
   - ISO 8601 admitido (con o sin milisegundos).
   - `end >= initial`.
3. Genera períodos (`getPeriods`), aplicando:
   - troceado por `window.period` o RRULE.
   - `offset` (si existe).
   - `traceback` (si existe en `element.value`).
4. Crea `computationId` aleatorio y guarda `results[id] = null`.
5. Lanza flujo asíncrono:
   - `getScopeInfo(scopeManagerUrl, metric.scope)`
   - `generateIntegrationsFromScopeInfo(scope)`
   - `calculateComputations(...)`
   - escribe resultado final en memoria `results[id] = array | errorMessage`.
6. Responde inmediatamente:

```json
{
  "code": 200,
  "message": "OK",
  "computation": "/api/v2/computations/<id>"
}
```

## 6.2 GET `/api/v2/computations/{computationId}`

Estados:

- `202`: aún en proceso (`results[id] === null`)
- `200`: completado (`results[id]` es array de computaciones)
- `400`: fallo funcional de cálculo/integraciones (se almacenó string de error)
- `404`: `id` inexistente
- `500`: caso inesperado de tipo no contemplado

Semántica importante:

- cuando devuelve resultado final (`array` o `string`), la entrada se borra de memoria (`delete results[id]`).
- `results` está en memoria del proceso: reinicios/pods nuevos pierden estado.

---

## 7. Estructura de salida de una computación

Cada elemento de `computations[]`:

```json
{
  "scope": { "project": "X", "class": "Y", "member": "opcional" },
  "period": { "from": "ISO8601", "to": "ISO8601" },
  "evidences": [],
  "value": 123.45
}
```

Se añade solo si `value` no es `NaN`.

---

## 8. Errores y rutas de fallo relevantes

Errores tempranos (POST):

- `End period date must be later than the initial.`
- `Dates must fit the standard ISO 8601.`
- período inválido (`metric.window.period ...`)

Errores asíncronos (aparecen en GET como `400` + `errorMessage`), ejemplos reales de tests:

- `Failed when requesting to ScopeManager`
- `Project scope not found...`
- `GitHub project not found or unauthorized...`
- `PT project not found...`
- `Unauthorized access to PT project...`
- `Heroku app not found...`
- `No Heroku token or expired one was given...`
- `Non existent or unauthorized access to Travis repo...`
- `No travis token or invalid one was given...`
- `No CC project found or unauthorized...`

---

## 9. Observaciones técnicas importantes

- `metric.window.type` está en el contrato, pero no altera lógica interna actualmente.
- en `related`, solo se permite un evento secundario (+ opcional `window`).
- `percentage/count` con 0 eventos principales acaba en `NaN` y no se persiste computación de ese período.
- para `member: "*"`, se hace producto cartesiano `periodos x miembros`.
- la rotación de API keys se hace por servicio (`authKeys[service].getKey()` round-robin).

---

## 10. Archivos clave para mantenimiento

- `controllers/apiv2computationsControllerService.js`
- `controllers/apiv2computationscomputationIdControllerService.js`
- `controllers/fetcher/fetcher.js`
- `controllers/sourcesManager/sourcesManager.js`
- `configurations/sourcesManager.json`
- `tests/testRequests.json`
- `tests/negativeTestRequests.json`
