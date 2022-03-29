import simpleGit, { SimpleGit } from 'simple-git';
import { existsSync } from 'fs';

export enum BranchType {
  Remote = 1,
  Local = 2,
}

class RepoKit {
  repo!: SimpleGit;

  async initialize(dirPath: string, remotePath?: string) {
    if (!existsSync(dirPath)) {
      if (remotePath) {
        console.log(`${dirPath} not exist, start to fetch remote repo ${remotePath}`);
        await simpleGit().clone(remotePath, dirPath);
        this.repo = await simpleGit(dirPath, { 'binary': 'git' });
      } else {
        throw new Error(`${dirPath} not exits, and not found remote repo, check repo address`);
      }
    }

    this.repo = await simpleGit(dirPath, { 'binary': 'git' });
  }

  delegate<T extends keyof SimpleGit>(methods: T[]) {
    methods.forEach((method) => {
      // @ts-ignore 动态 delegate 原 this 上并没有相关属性
      this[method] = async (...args) => {
        // @ts-ignore repo 上的多个方法签名不兼容
        return await this.repo[method](...args);
      }
    });
    const that = this as any as (Pick<SimpleGit, T> & RepoKit);
    return that;
  }

  async getCurrentBranchName() {
    const branchInfo = await this.repo.branch();
    return branchInfo.current;
  }

  async branchExists(branchName: string, branchType: BranchType = BranchType.Local) {
    switch(branchType) {
      case BranchType.Remote: {
        let exist = false;
        try {
          await this.repo.fetch('origin', branchName);
          exist = true;
        // eslint-disable-next-line no-empty
        } catch (_err) {}
        return exist;
      }
      case BranchType.Local: {
        const localBranches = await this.repo.branchLocal();
        return localBranches.all.some(branch => branch === branchName);
      }
      default:
        throw new Error(`branchExist get invalid branchType: ${branchType}`);
    }
  }

  async stashBeforeOperate() {
    const status = await this.repo.status();
    if (status.files.length) {
      console.log('local changes:');
      console.log(status.files.map(file => file.path).join('\n'));
      await this.repo.stash();
      console.log('stashed to local success, you can use `stash pop` to restore these local changes');
    }
  }

  async checkout(branchName: string, sourceBranch = 'master') {
    await this.stashBeforeOperate();
    const localExists = await this.branchExists(branchName, BranchType.Local);
    const remoteExists = await this.branchExists(branchName, BranchType.Remote);
    const sourceLocalExists = await this.branchExists(sourceBranch, BranchType.Local);
    const sourceRemoteExists = await this.branchExists(sourceBranch, BranchType.Remote);

    if (localExists) {
      await this.repo.checkout(branchName);
      console.log(`checkout to local branch: ${branchName} success`);
      if (remoteExists) {
        await this.repo.pull('origin', branchName);
        console.log(`sync remote branch ${branchName} success`);
      }
    } else if (remoteExists) {
      await this.repo.fetch(branchName);
      await this.repo.checkout(branchName);
      console.log(`checkout to remove branch: ${branchName}`);
      await this.repo.pull('origin', branchName);
      console.log(`sync remote branch ${branchName} success`);
    } else if (sourceLocalExists || sourceRemoteExists) {
      await this.checkout(sourceBranch);
      await this.repo.checkoutBranch(branchName, sourceBranch)
    } else {
      throw new Error(`fetch branch ${branchName} failed，source branch \`${sourceBranch}\` not exists`);
    }
  }

  async getLastLog() {
    const logs = await this.repo.log();
    return logs.latest;
  }

  async commitLocalChange(message: string) {
    const status = await this.repo.status();
    if (status.files.length) {
      console.log('these changes will be commit: ');
      console.log(status.files.map(item => item.path).join('\n'));
      await this.repo.add(['.']);
      await this.repo.commit(message);
      const lastLog = await this.getLastLog();
      console.log(`commit succeed, hash: ${lastLog?.hash}`);
    } else {
      console.log('there didn\'t has any files to commit');
    }

    return status;
  }

  async pushRemote() {
    const curBranchName = await this.getCurrentBranchName();
    const lastLog = await this.getLastLog();
    await this.repo.push('origin', curBranchName);
    console.log(`local change hash: ${lastLog?.hash} has commit to remote branch: ${curBranchName}`);
  }
}

export default RepoKit;