# Change Log

## [2.0.0]

- Requires VS Code 1.90 or newer
- Move projects and categories via drag & drop
- Add projects and categories directly inside a category via inline buttons
- Projects are added by selecting a folder instead of using the opened workspace folder
- "Edit" replaced by "Rename", which only changes the name
- New icons
- Declared support for Restricted Mode (untrusted workspaces)
- Fixed: deleting a category that contains projects failed and hid those projects
- Delete confirmation is now a modal dialog
- Commands that need a selected entry are hidden from the Command Palette
- Commands are grouped under "Project Manager" in the Command Palette
- Sidebar view renamed to "Projects"
- Updated build tooling and dependencies

## [1.0.2]

- Fixed "command not found" errors: the published bundle was rebuilt from the current source
- Added webpack, webpack-cli and ts-loader as dev dependencies

## [1.0.1]

- Fixed command IDs (missing dot between extension prefix and command name)

## [1.0.0]

- Initial release