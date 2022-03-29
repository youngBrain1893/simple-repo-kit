# Motivation
A easy way for cli/utils to operate with git.

Use [simple-git](https://www.npmjs.com/package/simple-git) ability and add some frequently used API（eg：`branchExists`、`getCurrentBranchName`）

# Usage
```bash
yarn add simple-repo-kit
```

```typescript
import SimpleRepoKit from 'simple-repo-kit';

const repo = new SimpleRepoKit();
await repo.initialize(__dirname);

const delegatedRepo = repo.delegate(['diff', 'log']); // https://www.npmjs.com/package/simple-git#API

delegatedRepo.getCurrentBranchName();
delegatedRepo.branchExists('some branch');
delegatedRepo.checkout('main');
delegatedRepo.commitLocalChange('commit message');
```

# APIs
- getCurrentBranchName()
- branchExists(branchName: string, branchType: BranchType)
- stashBeforeOperate()
- checkout(branchName: string, sourceBranch: string)
- getLastLog()
- commitLocalChange(message: string)

- delegate(methods: Array<keyof SimpleGit>)