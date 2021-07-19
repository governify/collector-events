# Governify Events Collector
[![Node.js CI](https://github.com/governify/collector-events/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/governify/collector-events/actions)
[![Coverage Status](https://coveralls.io/repos/github/governify/collector-events/badge.svg)](https://coveralls.io/github/governify/collector-events)
<a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-semistandard-brightgreen.svg" alt="Standard - JavaScript Style Guide"></a>
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)


# Overview
Events collector is a component of the Governify ecosystem.

This server was generated by the [oas-generator](https://github.com/isa-group/oas-generator) project.

## Running the server
To run the server, run:

```
npm start
```

This project leverages the mega-awesome [oas-tools](https://github.com/isa-group/oas-tools) middleware which does most all the work.

# Configuration needed
For the server to run, it is needed to include the json file `/configurations/scope-manager/authKeys.json`. The governify-project-bluejay-infrastructure is configured to insert this file for you but if you need to run the server you can obtain the file from there.
# Escalability
The file `./configurations/sourcesManager.json` cointains information about needed parameters for the collector needs for fetching API data. The structure is fairly simple:

The file is a JSON containing 3 objects:
- `endpoints`

  It stores the relation between and actual metric input and the endpoint of the API it connects to.
  This object contains as many objects inside as APIs the collector has integrated into it. Each object contains the relation between the data the metric needs to compute and the endpoint where the collector can find that data.
  ```javascript
  ./configurations/sourcesManager.json
  
  "endpoints": {
    "github": {
      "events": "/repos/{github.repoOwner}/{github.repository}/events"
    },
    "pivotal": {
      "activity": "/projects/{pivotal.project}/activity"
    },
    "heroku": {
      "releases": "/apps/{heroku.project}/releases"
    }
  }
  ```
  The endpoints can have integrations indicated between {}. Theese will be replaced with the actual project information to fetch the data.
- `substitutions`

  Some metrics, when looking for the match with the payload the APIs return, might need to look for the user of a repo for example. In this array it is possible to indicate the relation between an %STRING% string on a metric with an actual integration
  ```javascript
  ./configurations/sourcesManager.json
  
  "substitutions": [
    "GITHUB.REPO_OWNER->github.repoOwner"
  ]
  ```
  In this substitution any %GITHUB.REPO_OWNER% string inside a metric will be replaced with the github.repoOwner integration of the  project.
- `payloadDates`

  This configuration is changed whenever a new API is integrated in the system. Metrics have nothing to do with this as long as it is configured correctly on integration. It tells each API fetcher where can it find the timestamp of the event. For example:

  For this shortened pivotal activity payload:
  ```javascript
  ./configurations/sourcesManager.json
  
  {
    "kind": "story_update_activity",
    "guid": "2242320_415",
    "project_version": 415,
    "message": "César García Pascual started this feature",
    ...

    ...
    "performed_by": {
      "kind": "person",
      "id": 3296464,
      "name": "César García Pascual",
      "initials": "cgp"
    },
    "occurred_at": "2020-01-27T12:43:51Z"
  }
  ```
  The timestamp of this event is `2020-01-27T12:43:51Z` indicated on the field `occurred_at` at the end of the payload. So the sources manager configuration will look like this:

  ```javascript
  ./configurations/sourcesManager.json
  
  "payloadDates": {
    "pivotal": "occurred_at"
  }
  ```


  
## Collector Metric-Config Example
Having this simplified metric concerning the APIs sources:
 
```javascript
METRIC

"element": {
  "percentage": {
    "related": {
      "github": {
        "events": {
          "type": "PullRequestEvent",
          "payload": {
            "action": "closed",
            "pull_request": {
              "base": {
                "label": "%GITHUB.REPO_OWNER%:master"
              }
            }
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
      "highlight": "accepted"
    }
  }
}
```
 
The collector will fetch information from 2 sources. Looking at the GitHub request:
```javascript
METRIC

"github": {
  "events": {
    "type": "PullRequestEvent",
    "payload": {
      "action": "closed",
      "pull_request": {
        "base": {
          "label": "%GITHUB.REPO_OWNER%:master"
        }
      }
    }
  }
}
```
The system will fetch the events information. Going to the endpoints configuration:

```javascript
ENDPOINTS

"github": {
  "events": "/repos/{github.repoOwner}/{github.repository}/events"
}
```
The events information corresponds to the endpoint `/repos/{github.repoOwner}/{github.repository}/events`. The system will substitute `{github.repoOwner}` and `{github.repository}` with the information extracted from the Scope Manager for the project.

---

Looking at the most nested part of the metric we can see a % item:
```javascript
METRIC

"label": "%GITHUB.REPO_OWNER%:master"
```
Going to the substitutions configuration:
```javascript
SUBSTITUTIONS

"GITHUB.REPO_OWNER->github.repoOwner"
```

The system will replace %GITHUB.REPO_OWNER% with the information extracted from the Scope Manager for the project.

## GraphQL custom query

This method was created due to complexity of GraphQL nested objects. It is a custom method in which different steps are sequentially executed to fetch, transform and return data.

This is a metric for obtaining the number of assigned issues, in a column called "Doing" inside a GitHub project, for each member:
```
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
                            "query":  "{repository(name: \"%PROJECT.github.repository%\", owner: \"%PROJECT.github.repoOwner%\") {projects(first: 1) {nodes {name,columns(first: 10) {nodes {name,cards(first: 100) {totalCount,nodes {column {name},content {... on Issue {url,number,title,createdAt,updatedAt,assignees(first: 10) {nodes {login}}}}}}}}}}}}"                            
                        },
                        "1": {
                            "type": "objectGetSubObjects",
                            "location": "data.repository.projects.nodes.0.columns.nodes"
                        },
                        "2": {
                            "type": "objectsFilterObject",
                            "filters": [
                                "name == 'Doing'"
                            ],
                            "keep": "first"
                        },
                        "3": {
                            "type": "objectGetSubObjects",
                            "location": "cards.nodes"
                        },
                        "4": {
                            "type": "objectsFilterObjects",
                            "filters": [
                                "content.assignees.nodes.*any*.login == '%MEMBER.github.username%'"
                            ]
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
        "scopeManager": "SCOPEURL"
    }
}
```

As it can be seen, it is composed of 5 different steps. These steps are highly configurable and easy to add new steps.

## Steps

The different are given inside the steps key inside the custom object. Each step has to be inside a numbered object as they will be performed in an increasing order.

The steps are differenciated by its type. These steps types follow a simple pattern for better steps concatenation. 
 - Their types can start with "object", "objects" or nothing refering if they expect a single object, an array of objects or nothing at the execution. 
 - Their types have to end with "object" or "objects", refering if after the execution, a single object or an array of objects is left.

### Step type: queryGetObject and queryGetObjects
This steps expect nothing and returns or an object or an array of objects. They do the same but both types are correct for better reading of the DSL.

```
{
  "type": "queryGetObject",
  "query":  "{repository(name: \"%PROJECT.github.repository%\", owner: \"%PROJECT.github.repoOwner%\") {projects(first: 1) {nodes {name,columns(first: 10) {nodes {name,cards(first: 100) {totalCount,nodes {column {name},content {... on Issue {url,number,title,createdAt,updatedAt,assignees(first: 10) {nodes {login}}}}}}}}}}}}"                            
}
```

It needs a "query" parametter to be passed containing the graphQL query stringified and using comas between keys at the same level. There is a simple .js to transform graphQL queries into the string format in utils/queryToString.js to simplify the process. 
%PROJECT.github.repository% and %PROJECT.github.repoOwner% are used to insert the scopes identities inside the query and make it generic for all the different teams.

### Step type: objectGetSubObject and objectGetSubObjects
This steps expect a single object and return an object or an array of objects. They do the same but both types are correct for better reading of the DSL.
```
{
  "type": "objectGetSubObjects",
  "location": "data.repository.projects.nodes.0.columns.nodes"
}
```

It obtains the object/s inside an object. The object/s location is specified as if it was navegated through javascript.

### Step type: objectsFilterObject and objectsFilterObjects
This steps expect an array of zero or more objects and return an object or an array of objects.

A filters array with one or more strings is requried. These strings are equations. The left part contains the attribute location on the different objects to compare and the right part the value the obtained attribute is expected to be.

If the filter is *objectsFilterObject*, a parameter "keep" is expected as many objects can be retrieved from the filter and only one can remain. *first, last, min, max, sum, avg* are the valid options.
```
{
  "type": "objectsFilterObject",
  "filters": [
    "name == 'Doing'"
  ],
  "keep": "first"
}
```

If the filter is *objectsFilterObjects*, the keep parameter is no longer needed.
```
{
  "type": "objectsFilterObjects",
  "filters": [
    "content.assignees.nodes.*any*.login == '%MEMBER.github.username%'"
  ]
}
```

Here, information about the members can be included to compare for example, the content of an object key to be the username of a github username, as it can be seen in the example.

### Step type: runScript
This step expects anything and is passed in to a function exported as generic. It's expected to return a response in the form of an object/array or another kind in case it is compatible with the metric.

To this date it can receive two parametters:
- `script`: It is a function exported as generic and receives two inputs: the data being filtered/obtained from the steps executed before it and an object containing variables to generalize the script and modify different filters/conditions inside the script. It must return the processed data in order to move to the next pipeline or to be returned. This script has to be [scaped](https://www.freeformatter.com/json-escape.html#ad-output) in order to fit in the TPA as a JSON.
- `variables`: This is the object passed to the script containing the variabilization. The collector will also add to the object two keys (from, to) containing the window for filtering the information.

This is an example of a script without being scaped:

```javascript
module.exports.generic = function generic(inputData, variables) {
    function transitionAndDateFilter(timelineItem) {
        return timelineItem.projectColumnName &&
            timelineItem.projectColumnName === variables.actualProjectColumnName &&
            timelineItem.previousProjectColumnName === variables.previousProjectColumnName &&
            new Date(timelineItem.createdAt) > new Date(variables.from) &&
            new Date(timelineItem.createdAt) < new Date(variables.to);
    }
    function hasTimelineItems(issue) {
        return issue.timelineItems.length !== 0;
    }
    return inputData.map(issue => {
        return { ...issue, timelineItems: issue.timelineItems.nodes.filter(transitionAndDateFilter) }
    }).filter(hasTimelineItems);
}
```

It takes data from GitHub GQL API containing information about the cards (project card moves - old columnd and new column) and applies filters based on the variables it is passed to. The step would look like this:

```json
{
    "type": "runScript",
    "variables": {
        "previousProjectColumnName": "In progress",
        "actualProjectColumnName": "In review"
    },
    "script": "module.exports.generic = function filterIssuesByTimelineItems(inputData, variables) {\r\n    function transitionAndDateFilter(timelineItem) {\r\n        return timelineItem.projectColumnName &&\r\n            timelineItem.projectColumnName === variables.actualProjectColumnName &&\r\n            timelineItem.previousProjectColumnName === variables.previousProjectColumnName &&\r\n            new Date(timelineItem.createdAt) > new Date(variables.from) &&\r\n            new Date(timelineItem.createdAt) < new Date(variables.to);\r\n    }\r\n    function hasTimelineItems(issue) {\r\n        return issue.timelineItems.length !== 0;\r\n    }\r\n    return inputData.map(issue => {\r\n        return { ...issue, timelineItems: issue.timelineItems.nodes.filter(transitionAndDateFilter) }\r\n    }).filter(hasTimelineItems);\r\n}"
}
```
As it can be seen it will filter and keep issues whose cards have been moved from a column called "In progress" to a column called "In review". It will also use the from and to  filter the data.


