const axios = require('axios');
const logger = require('governify-commons').getLogger().tag('fetcher-zenhub');

const getInfo = async (options) => {
    try {
        logger.info('Fetching Zenhub metric', options.metric, `for ${options.member ? options.member.memberId : 'Team'}`);
        let result = [];
        let identitity
        if(options.member !== undefined)
            identitity = options.member.identities.find(identitity => identitity.source === 'github');
        switch (options.metric) {
            case 'ISSUES_BY_COLUMN':
                result = await fetchZenhubIssuesByColumns(options.filters, options.workspaceId, options.zenhubToken);
                break;
            case 'ISSUES_BY_COLUMN_WITH_ASSOCIATED_BRANCHES':
                const zenhubIssuesBranches = await fetchZenhubIssuesByColumns(options.filters, options.workspaceId, options.zenhubToken);
                const issuesWithBranches = await getGithubIssues(options.owner, options.repository, options.githubToken);
                result = issuesWithBranches.filter(issue =>
                    zenhubIssuesBranches.some(zenhubIssue => zenhubIssue.number === issue.number) &&
                    issue.linkedBranches.nodes.length > 0
                );
                break;
            case 'ISSUES_BY_COLUMN_WITH_ASSOCIATED_PULL_REQUESTS_BY_STATUS':
                const zenhubIssuesPR = await fetchZenhubIssuesByColumns(options.filters, options.workspaceId, options.zenhubToken);
                const githubIssuesWithPRs = await getGithubIssues(options.owner, options.repository, options.githubToken);
                result = githubIssuesWithPRs.filter(issue => 
                    zenhubIssuesPR.some(zenhubIssue => zenhubIssue.number === issue.number) &&
                    issue.closedByPullRequestsReferences.nodes.some(pr => pr.state === options.filters.status)
                );
                break;
            case 'ISSUES_BY_COLUMN_ASSOCIATED_TO_MEMBER':
                const zenhubIssuesMember = await fetchZenhubIssuesByColumns(options.filters, options.workspaceId, options.zenhubToken);
                result = zenhubIssuesMember.filter(issue => 
                    issue.assignees.nodes.some(assignee => assignee.login === identitity.username)
                );
                break;
            case 'ISSUES_BY_COLUMN_FILTERED_BY_UPDATED_AT_DATE_ASSOCIATED_TO_MEMBER':
                const zenhubIssuesDate = await fetchZenhubIssuesByColumns(options.filters, options.workspaceId, options.zenhubToken);
                result = zenhubIssuesDate.filter(issue => {
                    const issueUpdatedAt = new Date(issue.updatedAt);
                    const fromDate = new Date(options.from);
                    const toDate = new Date(options.to);
                    return issueUpdatedAt >= fromDate && 
                           issueUpdatedAt <= toDate && 
                           issue.assignees.nodes.some(assignee => assignee.login === identitity.username);
                });
                break;
            case 'ISSUES_WITH_DIFFERENT_BRANCHES_BY_COLUMN':
                const zenhubIssuesDiffBranches = await fetchZenhubIssuesByColumns(options.filters, options.workspaceId, options.zenhubToken);
                const issuesWithDiffBranches = await getGithubIssues(options.owner, options.repository, options.githubToken);
                const issuesFiltered = issuesWithDiffBranches.filter(issue =>
                    zenhubIssuesDiffBranches.some(zenhubIssue => zenhubIssue.number === issue.number) &&
                    issue.linkedBranches.nodes.length > 0
                );
                const knownBranches = new Set();
                result = issuesFiltered.filter(issue => {
                    const issueBranches = issue.linkedBranches.nodes.map(branch => branch.ref.name);
                    const hasUniqueBranch = issueBranches.some(branch => {
                        if (!knownBranches.has(branch)) {
                            knownBranches.add(branch);
                            return true;
                        }
                        return false;
                    });
                    return hasUniqueBranch; 
                });
                break;
        }
        return result;
    } catch (err) {
        throw err;
    }
};

const fetchZenhubIssuesByColumns = async (filters, workspaceId, zenhubToken) => {
    let zenhubIssues = [];
    if (filters.columns) {
        for (const column of filters.columns) {
            if (column === "Closed") {
                zenhubIssues.push(...await getClosedIssues(workspaceId, zenhubToken));
            } else {
                zenhubIssues.push(...await getZenhubIssuesByColumn(workspaceId, column, zenhubToken));
            }
        }
    } else {
        if (filters.column === "Closed") {
            zenhubIssues = await getClosedIssues(workspaceId, zenhubToken);
        } else {
            zenhubIssues = await getZenhubIssuesByColumn(workspaceId, filters.column, zenhubToken);
        }
    }
    return zenhubIssues;
};

const getZenhubIssuesByColumn = async (workspaceId, column, zenhubToken) => {
    const pipelinesQuery = `
    query GetPipelines {
      workspace(id: "${workspaceId}") {
        id
        name
        pipelinesConnection(first:10){
          nodes{
            id
            name
          }
        }
      }
    }`;
    const pipelines = await getAPIData("https://api.zenhub.com/public/graphql", pipelinesQuery, zenhubToken);

    const pipeline = pipelines.data.workspace.pipelinesConnection.nodes.find(p => p.name === column);

    if (!pipeline) {
        return [];
    }

    let issues = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
        const issuesQuery = `
        query IssuesByPipeline {
            searchIssuesByPipeline(first:100, pipelineId:"${pipeline.id}", filters: {}, after: ${endCursor ? `"${endCursor}"` : null}) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                nodes {
                    number
                    title
                    updatedAt
                    pullRequest
                    assignees(first:10) {
                        nodes {
                            name
                            login
                        }
                    }
                }
            }
        }`;

        const response = await getAPIData("https://api.zenhub.com/public/graphql", issuesQuery, zenhubToken);
        const data = response.data.searchIssuesByPipeline;

        issues = issues.concat(data.nodes);
        hasNextPage = data.pageInfo.hasNextPage;
        endCursor = data.pageInfo.endCursor;
    }

    issues = issues.filter(issue => !issue.pullRequest);

    return issues;
};

const getClosedIssues = async (workspaceId, zenhubToken) => {
    let closedIssues = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
        const closedIssuesQuery = `query {
            searchClosedIssues(workspaceId: "${workspaceId}", filters: {}, first: 100, after: ${endCursor ? `"${endCursor}"` : null}) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                nodes {
                    number
                    title
                    updatedAt
                    pullRequest
                    assignees(first:10) {
                        nodes {
                            name
                            login
                        }
                    }
                }
            }
        }`;

        const response = await getAPIData("https://api.zenhub.com/public/graphql", closedIssuesQuery, zenhubToken);
        const data = response.data.searchClosedIssues;

        closedIssues = closedIssues.concat(data.nodes);
        hasNextPage = data.pageInfo.hasNextPage;
        endCursor = data.pageInfo.endCursor;
    }

    closedIssues = closedIssues.filter(issue => !issue.pullRequest);

    return closedIssues;
}

const getGithubIssues = async (repoOwner, repoName, githubToken) => {
    let githubIssues = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
        const issuesQuery = `{
            repository(owner: "${repoOwner}", name: "${repoName}") {
                issues(first: 100, after: ${endCursor ? `"${endCursor}"` : null}) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    nodes {
                        number
                        title
                        updatedAt
                        assignees(first: 10) {
                            nodes {
                                name
                                login
                            }
                        }
                        linkedBranches(first: 10) {
                            nodes {
                                ref {
                                    name
                                }
                            }
                        }
                        closedByPullRequestsReferences(first:10){
                            nodes{
                                number
                                title
                                state   
                            }
                        }
                    }
                }
            }
        }`;

        const response = await getAPIData("https://api.github.com/graphql", issuesQuery, githubToken);
        const data = response.data.repository.issues;

        githubIssues = githubIssues.concat(data.nodes);
        hasNextPage = data.pageInfo.hasNextPage;
        endCursor = data.pageInfo.endCursor;
    }

    return githubIssues;
}


const getAPIData = async (url, query, apiKey) => {
    const response = await axios.post(
        url,
        { query: query },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            }
        }
    );
    return response.data;
};

module.exports = {
    getInfo
};