import * as assert from 'assert';
import * as vscode from 'vscode';

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
});
