import handler from './resync-drive-current.js';

export const config = { maxDuration: 60 };

export default async function patchedHandler(req, res) {
  const originalExec = RegExp.prototype.exec;
  RegExp.prototype.exec = function patchedExec(input) {
    if (this.source.includes('\\z')) {
      const fixedSource = this.source.split('\\z').join('(?![\\s\\S])');
      const fixed = new RegExp(fixedSource, this.flags);
      fixed.lastIndex = this.lastIndex;
      const result = originalExec.call(fixed, input);
      this.lastIndex = fixed.lastIndex;
      return result;
    }
    return originalExec.call(this, input);
  };
  try {
    return await handler(req, res);
  } finally {
    RegExp.prototype.exec = originalExec;
  }
}
