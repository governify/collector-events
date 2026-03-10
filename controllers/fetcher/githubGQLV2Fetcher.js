const axios = require('axios');
const logger = require('governify-commons').getLogger().tag('fetcher-githubGQLV2');

const getInfo = async (options) => {
    try {
        logger.info('Fetching Zenhub metric', options.metric, `for ${options.member ? options.member.memberId : 'Team'}`);
        let result = [];
        let identity;
        if (options.member !== undefined)
            identity = options.member.identities.find(identity => identity.source === 'github');
        switch (options.metric) {
            case 'ISSUES_BY_COLUMN':
                result = await fetchGithubIssuesByColumns(options.filters, options.owner, options.repository, options.token);
                break;
            case 'ISSUES_BY_COLUMN_WITH_ASSOCIATED_BRANCHES':
                const issuesBranches = await fetchGithubIssuesByColumns(options.filters, options.owner, options.repository, options.token);
                result = issuesBranches.filter(issue => issue.linkedBranches.nodes.length > 0);
                break;
            case 'ISSUES_BY_COLUMN_WITH_ASSOCIATED_PULL_REQUESTS_BY_STATUS':
                const issuesPR = await fetchGithubIssuesByColumns(options.filters, options.owner, options.repository, options.token);
                result = issuesPR.filter(issue => issue.closedByPullRequestsReferences.nodes.some(pr => pr.state === options.filters.status));
                break;
            case 'ISSUES_BY_COLUMN_ASSOCIATED_TO_MEMBER':
                const issuesMember = await fetchGithubIssuesByColumns(options.filters, options.owner, options.repository, options.token);
                result = issuesMember.filter(issue => issue.assignees.nodes.some(assignee => assignee.login === identity.username));
                break;
            case 'ISSUES_BY_COLUMN_FILTERED_BY_UPDATED_AT_DATE_ASSOCIATED_TO_MEMBER':
                const issuesDate = await fetchGithubIssuesByColumns(options.filters, options.owner, options.repository, options.token);
                result = issuesDate.filter(issue => {
                    const issueUpdatedAt = new Date(issue.updatedAt);
                    const fromDate = new Date(options.from);
                    const toDate = new Date(options.to);
                    return issueUpdatedAt >= fromDate &&
                        issueUpdatedAt <= toDate &&
                        issue.assignees.nodes.some(a => a.login === identity.username);
                });
                break;
            case 'ISSUES_WITH_DIFFERENT_BRANCHES_BY_COLUMN':
                const issuesDiffBranches = await fetchGithubIssuesByColumns(options.filters, options.owner, options.repository, options.token);
                const knownBranches = [];
                for (const issue of issuesDiffBranches) {
                    let issueAdded = false;
                    for (const branch of issue.linkedBranches.nodes) {
                        if (!knownBranches.includes(branch.ref.name)) {
                            knownBranches.push(branch.ref.name);
                            if (!issueAdded) {
                                result.push(issue);
                                issueAdded = true;
                            }
                        }
                    }
                }
                break;
        }
        return result;
    } catch (err) {
        throw err;
    }
};

const fetchGithubIssuesByColumns = async (filters, repoOwner, repoName, githubToken) => {
    const projects = await getGithubProjects(repoOwner, repoName, githubToken);
    let githubIssues = [];
    for (const project of projects) {
        const items = await getGithubProjectItems(project.id, githubToken);
        const filtered = items.filter(item => {
            const status = item.fieldValues.nodes.find(f => f.field?.name === "Status");
            if (!status) return false;
            if (filters.columns)
                return filters.columns.includes(status.name);
            return status.name === filters.column;
        });
        githubIssues.push(...filtered.map(i => i.content).filter(content => content && content.__typename === "Issue"));
    }
    return githubIssues;
};

const getGithubProjects = async (repoOwner, repoName, githubToken) => {
    const query = `
    query {
      repository(owner: "${repoOwner}", name: "${repoName}") {
        projectsV2(first: 10) {
          nodes {
            id
            title
          }
        }
      }
    }`;

    const response = await getAPIData(query, githubToken);
    return response.repository.projectsV2.nodes;
};

const getGithubProjectItems = async (projectId, githubToken) => {
    let issues = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
        const query = `
        query {
          node(id: "${projectId}") {
            ... on ProjectV2 {
              items(first: 100, after: ${endCursor ? `"${endCursor}"` : null}) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  fieldValues(first: 10) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                    }
                  }
                  content {
                    __typename
                    ... on Issue {
                      number
                      title
                      updatedAt
                      assignees(first:10){
                        nodes{
                          login
                          name
                        }
                      }
                      linkedBranches(first:10){
                        nodes{
                          ref{
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
              }
            }
          }
        }`;
        const response = await getAPIData(query, githubToken);
        const data = response.node.items;
        issues = issues.concat(data.nodes);
        hasNextPage = data.pageInfo.hasNextPage;
        endCursor = data.pageInfo.endCursor;
    }
    return issues;
};

const getAPIData = async (query, apiKey) => {
    const response = await axios.post(
        "https://api.github.com/graphql",
        { query },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        }
    );

    return response.data.data;
};

module.exports = {
    getInfo
};