import * as assert from 'assert';
import * as vscode from 'vscode';
import { isSameOrDescendant } from '../extension';

suite('Extension Test Suite', () => {

	test('activates and registers all commands', async () => {
		const extension = vscode.extensions.getExtension('WireCore.vscode-project-manager');
		assert.ok(extension);
		await extension.activate();

		const commands = await vscode.commands.getCommands(true);
		const declared: Array<{ command: string }> = extension.packageJSON.contributes.commands;
		for (const { command } of declared) {
			assert.ok(commands.includes(command), `command not registered: ${command}`);
		}
	});

	test('prevents moving a category into itself or its descendants', () => {
		// 1 > 2 > 3, 4 is a separate root
		const categories = [
			{ _id: 1, _parentId: 0 },
			{ _id: 2, _parentId: 1 },
			{ _id: 3, _parentId: 2 },
			{ _id: 4, _parentId: 0 },
		];
		assert.strictEqual(isSameOrDescendant(categories, 1, 1), true);
		assert.strictEqual(isSameOrDescendant(categories, 3, 1), true);
		assert.strictEqual(isSameOrDescendant(categories, 4, 1), false);
		assert.strictEqual(isSameOrDescendant(categories, 1, 3), false);
		assert.strictEqual(isSameOrDescendant(categories, 0, 1), false);
	});
});
