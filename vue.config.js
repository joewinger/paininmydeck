const { gitDescribeSync } = require('git-describe');
process.env.VUE_APP_COMMIT_HASH = gitDescribeSync().hash || 'ERROR';