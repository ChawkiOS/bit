// covers also init, commit, add and import commands

import path from 'path';
import fs from 'fs-extra';
import { expect } from 'chai';
import Helper, { VERSION_DELIMITER } from '../e2e-helper';
import * as fixtures from '../fixtures/fixtures';

describe('bit export command', function () {
  this.timeout(0);
  const helper = new Helper();
  const createFile = (dir, name) => {
    const componentFixture = `module.exports = function foo() { return 'got ${name}'; };`;
    fs.outputFileSync(path.join(helper.localScopePath, dir, `${name}.js`), componentFixture);
  };
  after(() => {
    helper.destroyEnv();
  });
  describe('of one component', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createComponentBarFoo();
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo();
      helper.exportComponent('bar/foo');
    });
    it('should not write the exported component into bit.json', () => {
      const bitJson = helper.readBitJson();
      expect(bitJson.dependencies).not.to.have.property(`${helper.remoteScope}/bar/foo`);
    });
    it('should write the exported component into bit.map', () => {
      const bitMap = helper.readBitMap();
      expect(bitMap).to.have.property(`${helper.remoteScope}/bar/foo${VERSION_DELIMITER}0.0.1`);
    });
  });
  describe('with multiple components, each has one file', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      createFile('bar', 'foo1');
      createFile('bar', 'foo2');
      createFile('baz', 'foo1');
      createFile('baz', 'foo2');
      helper.runCmd('bit add bar/foo1.js');
      helper.runCmd('bit add bar/foo2.js');
      helper.runCmd('bit add baz/foo1.js');
      helper.runCmd('bit add baz/foo2.js');
      helper.commitAllComponents();
      helper.exportAllComponents();
    });
    it('should export them all', () => {
      const output = helper.runCmd(`bit list ${helper.remoteScope}`);
      expect(output.includes('found 4 components')).to.be.true;
      expect(output.includes('baz/foo1')).to.be.true;
      expect(output.includes('baz/foo2')).to.be.true;
      expect(output.includes('bar/foo1')).to.be.true;
      expect(output.includes('bar/foo2')).to.be.true;
    });
  });

  describe('with multiple components, each has multiple files', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      createFile('bar', 'foo1');
      createFile('bar', 'foo2');
      createFile('baz', 'foo1');
      createFile('baz', 'foo2');
      helper.runCmd('bit add bar -m foo1.js');
      helper.runCmd('bit add baz -m foo1.js');
      helper.commitAllComponents();
      helper.exportAllComponents();
    });
    it('should export them all', () => {
      const output = helper.runCmd(`bit list ${helper.remoteScope} --bare`);
      expect(output.includes('found 2 components')).to.be.true;
      expect(output.includes('bar')).to.be.true;
      expect(output.includes('baz')).to.be.true;
    });
  });

  describe('with specifying multiple components in the CLI', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      createFile('bar', 'foo1');
      createFile('bar', 'foo2');
      helper.runCmd('bit add bar/foo1.js');
      helper.runCmd('bit add bar/foo2.js');
      helper.commitAllComponents();
      helper.exportComponent('bar/foo1 bar/foo2');
    });
    it('should export them all', () => {
      const output = helper.runCmd(`bit list ${helper.remoteScope} --bare`);
      expect(output.includes('found 2 components')).to.be.true;
      expect(output.includes('bar/foo1')).to.be.true;
      expect(output.includes('bar/foo2')).to.be.true;
    });
    it('bit list locally should display 2 components', () => {
      const output = helper.runCmd('bit list');
      expect(output.includes('found 2 components in local scope')).to.be.true;
    });
  });

  describe('with dependencies', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      const isTypeFixture = "module.exports = function isType() { return 'got is-type'; };";
      helper.createFile('utils', 'is-type.js', isTypeFixture);
      helper.addComponent('utils/is-type.js');
      helper.commitComponent('utils/is-type');
      helper.exportComponent('utils/is-type');
      const isStringFixture =
        "const isType = require('./is-type.js'); module.exports = function isString() { return isType() +  ' and got is-string'; };";
      helper.createFile('utils', 'is-string.js', isStringFixture);
      helper.addComponent('utils/is-string.js');
      helper.commitComponent('utils/is-string');
      helper.exportComponent('utils/is-string');
    });
    it('should export them successfully', () => {
      const output = helper.runCmd(`bit list ${helper.remoteScope}`);
      expect(output.includes('found 2 components')).to.be.true;
      expect(output.includes('utils/is-type')).to.be.true;
      expect(output.includes('utils/is-string')).to.be.true;
    });
  });

  describe('with dependencies and export-all', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      const isTypeFixture = "module.exports = function isType() { return 'got is-type'; };";
      helper.createFile('utils', 'is-type.js', isTypeFixture);
      helper.addComponent('utils/is-type.js');
      helper.commitComponent('utils/is-type');
      const isStringFixture =
        "const isType = require('./is-type.js'); module.exports = function isString() { return isType() +  ' and got is-string'; };";
      helper.createFile('utils', 'is-string.js', isStringFixture);
      helper.addComponent('utils/is-string.js');
      helper.commitComponent('utils/is-string');
      helper.exportAllComponents();
    });
    it('should export them all', () => {
      const output = helper.runCmd(`bit list ${helper.remoteScope}`);
      expect(output.includes('found 2 components')).to.be.true;
      expect(output.includes('utils/is-type')).to.be.true;
      expect(output.includes('utils/is-string')).to.be.true;
    });
  });
  describe('with no components to export', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
    });
    it('should print nothing to export', () => {
      const output = helper.exportAllComponents();
      expect(output).to.include('nothing to export');
    });
  });
  describe('with multiple versions', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createComponentBarFoo();
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo();
      helper.exportComponent('bar/foo');
      helper.commitComponent('bar/foo -f');
      helper.exportComponent('bar/foo');
    });
    it('should export it with no errors', () => {
      const output = helper.runCmd(`bit list ${helper.remoteScope}`);
      expect(output.includes('found 1 components')).to.be.true;
      expect(output.includes('bar/foo')).to.be.true;
      expect(output.includes('2')).to.be.true; // this is the version
    });
  });

  describe('imported (v1), exported (v2) and then exported again (v3)', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createComponentBarFoo();
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo();
      helper.exportComponent('bar/foo'); // v1

      helper.reInitLocalScope();
      helper.addRemoteScope();
      helper.importComponent('bar/foo');

      helper.createFile(path.join('components', 'bar', 'foo'), 'foo.js', 'console.log("got foo v2")');
      helper.commitComponentBarFoo();
      helper.exportComponent('bar/foo'); // v2

      helper.createFile(path.join('components', 'bar', 'foo'), 'foo.js', 'console.log("got foo v3")');
      helper.commitComponentBarFoo();
      helper.exportComponent('bar/foo'); // v3
    });
    it('should export it with no errors', () => {
      const output = helper.listRemoteScope();
      expect(output.includes(`${helper.remoteScope}/bar/foo@0.0.3`)).to.be.true;
    });
  });

  describe('after import with dependencies', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      const isTypeFixture = "module.exports = function isType() { return 'got is-type'; };";
      helper.createFile('utils', 'is-type.js', isTypeFixture);
      helper.addComponent('utils/is-type.js');
      const isStringFixture =
        "const isType = require('./is-type.js'); module.exports = function isString() { return isType() +  ' and got is-string'; };";
      helper.createFile('utils', 'is-string.js', isStringFixture);
      helper.addComponent('utils/is-string.js');
      helper.commitAllComponents();
      helper.exportAllComponents();

      helper.reInitLocalScope();
      helper.addRemoteScope();
      helper.importComponent('utils/is-string');
      helper.commitComponent(`${helper.remoteScope}/utils/is-string -f`);
      helper.exportComponent(`${helper.remoteScope}/utils/is-string`);
    });

    it('should export it successfully', () => {
      const output = helper.listRemoteScope();
      expect(output.includes('utils/is-string@0.0.2')).to.be.true;
    });
  });

  describe('with dependencies on a different scope', () => {
    let anotherScope;
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      const isTypeFixture = "module.exports = function isType() { return 'got is-type'; };";
      helper.createFile('utils', 'is-type.js', isTypeFixture);
      helper.addComponent('utils/is-type.js');
      helper.commitComponent('utils/is-type');
      const isStringFixture =
        "const isType = require('./is-type.js'); module.exports = function isString() { return isType() +  ' and got is-string'; };";
      helper.createFile('utils', 'is-string.js', isStringFixture);
      helper.addComponent('utils/is-string.js');
      helper.commitComponent('utils/is-string');
      helper.exportComponent('utils/is-type');

      const { scopeName, scopePath } = helper.getNewBareScope();
      anotherScope = scopeName;
      helper.addRemoteScope(scopePath);
      helper.exportComponent('utils/is-string', scopeName);
    });
    it('should fetch the dependency from a different scope and successfully export the component', () => {
      const output = helper.runCmd(`bit list ${anotherScope}`);
      expect(output.includes('found 1 components')).to.be.true;
      expect(output.includes('utils/is-string')).to.be.true;
    });
  });

  describe('exporting version 3 of a component after importing version 2', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createComponentBarFoo();
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo(); // v1
      helper.commitComponent('bar/foo -f'); // v2
      helper.exportComponent('bar/foo');

      helper.reInitLocalScope();
      helper.addRemoteScope();
      helper.importComponent('bar/foo');

      helper.commitComponentBarFoo(); // v3
      helper.exportComponent(`${helper.remoteScope}/bar/foo`);
    });
    it('should export it with no errors', () => {
      const output = helper.listRemoteScope();
      expect(output.includes(`${helper.remoteScope}/bar/foo@0.0.3`)).to.be.true;
    });
  });

  describe('exporting version 3 of a component as an author', () => {
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createFile('bar', 'foo.js', 'console.log("got foo v1")');
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo(); // v1
      helper.exportComponent('bar/foo');

      helper.createFile('bar', 'foo.js', 'console.log("got foo v2")');
      helper.commitComponentBarFoo(); // v2
      helper.exportComponent('bar/foo');

      helper.createFile('bar', 'foo.js', 'console.log("got foo v3")');
      helper.commitComponentBarFoo(); // v3
      helper.exportComponent('bar/foo');
    });
    it('should export it with no errors', () => {
      const output = helper.listRemoteScope();
      expect(output.includes('found 1 components')).to.be.true;
      expect(output.includes('bar/foo')).to.be.true;
      expect(output.includes('3')).to.be.true; // this is the version
    });
  });

  describe('with a PNG file', () => {
    let pngSize;
    let destPngFile;
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createComponentBarFoo();
      const sourcePngFile = path.join(__dirname, '..', 'fixtures', 'png_fixture.png');
      destPngFile = path.join(helper.localScopePath, 'bar', 'png_fixture.png');
      fs.copySync(sourcePngFile, destPngFile);
      const stats = fs.statSync(destPngFile);
      pngSize = stats.size;
      helper.runCmd('bit add bar -m foo.js -i bar/foo');
      helper.commitAllComponents();
      helper.exportAllComponents();
    });
    it('should export it with no errors', () => {
      const output = helper.listRemoteScope();
      expect(output.includes('found 1 components')).to.be.true;
      expect(output.includes('bar/foo')).to.be.true;
    });
    describe('after importing the file', () => {
      before(() => {
        helper.importComponent('bar/foo');
      });
      it('the size of the binary file should not be changed', () => {
        const currentStats = fs.statSync(destPngFile);
        const currentSize = currentStats.size;
        expect(currentSize).to.equal(pngSize);
      });
    });
  });

  describe('export a component, do not modify it and export again to the same scope', () => {
    let output;
    let errorOutput;
    before(() => {
      helper.setNewLocalAndRemoteScopes();
      helper.createComponentBarFoo();
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo();
      helper.exportComponent('bar/foo');
      try {
        output = helper.exportComponent('bar/foo');
      } catch (err) {
        errorOutput = err.message;
      }
    });
    it('should not export the component', () => {
      expect(output).to.be.undefined;
    });
    it('should throw an error saying the component was already exported', () => {
      expect(errorOutput.includes('has been already exported')).to.be.true;
    });
  });

  describe('remote scope with is-string2 and a dependency is-type with version 0.0.2 only', () => {
    let output;
    let remote2;
    let remote2Path;
    before(() => {
      // step1: export is-type and is-string1 both 0.0.1 to remote1
      helper.setNewLocalAndRemoteScopes();
      helper.createFile('utils', 'is-type.js', fixtures.isType);
      helper.createFile('utils', 'is-string1.js', fixtures.isString);
      helper.addComponent('utils/is-type.js');
      helper.addComponent('utils/is-string1.js');
      helper.tagAllWithoutMessage('', '0.0.1');
      helper.exportAllComponents();

      // step2: export is-type@0.0.2 and is-string2 to remote1
      helper.reInitLocalScope();
      helper.addRemoteScope();
      helper.importComponent('utils/is-type');
      helper.commitComponent('utils/is-type', undefined, '0.0.2 --force');
      helper.exportAllComponents();
      const isType = helper.getRequireBitPath('utils', 'is-type');
      helper.createFile(
        'utils',
        'is-string2.js',
        `const isType = require('${isType}'); module.exports = function isString() { return isType() +  ' and got is-string'; };`
      );
      helper.addComponent('utils/is-string2.js');
      const bitShowOutput = helper.showComponentParsed('utils/is-string2');
      expect(bitShowOutput.dependencies[0].id).to.have.string('utils/is-type@0.0.2');
      helper.commitComponent('utils/is-string2');
      helper.exportAllComponents();

      // step3: export is-string2 to remote2, so then it will have only the 0.0.2 version of the is-type dependency
      const { scopeName, scopePath } = helper.getNewBareScope();
      remote2 = scopeName;
      remote2Path = scopePath;
      helper.addRemoteScope(scopePath);
      helper.exportComponent('utils/is-string2', remote2);
    });
    it('should have is-type@0.0.2 on that remote', () => {
      const isType = helper.catComponent(`${helper.remoteScope}/utils/is-type@0.0.2`, remote2Path);
      expect(isType).to.have.property('files');
    });
    it('should not have is-type@0.0.1 on that remote', () => {
      let isType;
      try {
        isType = helper.catComponent(`${helper.remoteScope}/utils/is-type@0.0.1`, remote2Path);
      } catch (err) {
        isType = err.toString();
      }
      expect(isType).to.have.string('component was not found');
    });
    describe('export a component is-string1 with a dependency is-type of version 0.0.1', () => {
      before(() => {
        helper.importComponent('utils/is-string1');
        output = helper.exportComponent('utils/is-string1', remote2);
      });
      it('should not throw an error saying it does not have the version 0.0.1 of the dependency', () => {
        expect(output).to.not.have.string('failed loading version 0.0.1');
      });
      it('should show a successful message', () => {
        expect(output).to.have.string('exported 1 components to scope');
      });
      it('should fetch is-type@0.0.1 from remote1', () => {
        const isType = helper.catComponent(`${helper.remoteScope}/utils/is-type@0.0.1`, remote2Path);
        expect(isType).to.have.property('files');
      });
    });
  });
});
