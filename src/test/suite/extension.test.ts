import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
import * as myExtension from '../../extension';

suite('getFeaturesDirectoryPath', () => {
	test('should append features to path if current directory doesn\'t end with features', () => {
		// arrange
		const currentDirectory = 'C:\\test\\path';
		// act
		const actual = myExtension.getFeaturesDirectoryPath(currentDirectory);
		// asert
		assert.equal(actual, 'C:\\test\\path\\features');
	});

	test('should append features to path if current directory doesn\'t end with features and have a trailing \\', () => {
		// arrange
		const currentDirectory = 'C:\\test\\path\\';
		// act
		const actual = myExtension.getFeaturesDirectoryPath(currentDirectory);
		// asert
		assert.equal(actual, 'C:\\test\\path\\features');
	});

	test('should not append features to path if current directory end with features', () => {
		// arrange
		const currentDirectory = 'C:\\test\\path\\features';
		// act
		const actual = myExtension.getFeaturesDirectoryPath(currentDirectory);
		// asert
		assert.equal(actual, 'C:\\test\\path\\features');
	});

	test('should not append features to path if current directory end with features with a trailing \\', () => {
		// arrange
		const currentDirectory = 'C:\\test\\path\\features\\';
		// act
		const actual = myExtension.getFeaturesDirectoryPath(currentDirectory);
		// asert
		assert.equal(actual, 'C:\\test\\path\\features');
	});
});

suite('isNameValid', () => {
	const validNames = ['test', 'qmsdfhjq', 's', 'login', 'space between'];
	validNames.forEach((featureName) =>  {
		test('should return true if name is valid', () => {
			// act
			const actual = myExtension.isNameValid(featureName);
			// asert
			assert.ok(actual);
		});
	});
	test('should return false if name is undefined', () => {
		// arrange
		let featureName;
		// act
		const actual = myExtension.isNameValid(featureName);
		// asert
		assert.ok(!actual);
	});
	test('should return false if name is blank', () => {
		// arrange
		const featureName = '';
		// act
		const actual = myExtension.isNameValid(featureName);
		// asert
		assert.ok(!actual);
	});
	test('should return false if name is a white space', () => {
		// arrange
		const featureName = '    ';
		// act
		const actual = myExtension.isNameValid(featureName);
		// asert
		assert.ok(!actual);
	});
});
