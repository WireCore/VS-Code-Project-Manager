"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
let extensionContext;
let treeDataProvider;
function activate(context) {
    extensionContext = context;
    treeDataProvider = new TreeDataProvider();
    vscode.window.registerTreeDataProvider('projectManagerTreeView', treeDataProvider);
    vscode.commands.registerCommand('vscode-project-manager.addProject', () => {
        createProjectEntry();
    });
    vscode.commands.registerCommand('vscode-project-manager.editEntry', (item) => {
        if (item.project === undefined && item.category !== undefined) {
            // edit category
            editCategoryEntry(item.category._id);
        }
        else if (item.project !== undefined && item.category === undefined) {
            // edit project
            editProjectEntry(item.project._id);
        }
    });
    vscode.commands.registerCommand('vscode-project-manager.deleteEntry', (item) => {
        vscode.window.showInformationMessage("You realy want to delete this?", "Yes", "No").then(answer => {
            if (answer === "Yes") {
                if (item.project === undefined && item.category !== undefined) {
                    // delete category
                    Category.deleteById(item.category._id);
                }
                else if (item.project !== undefined && item.category === undefined) {
                    // delete project
                    Project.deleteById(item.project._id);
                }
                treeDataProvider.refresh();
            }
        });
    });
    vscode.commands.registerCommand('vscode-project-manager.addCategory', () => {
        createCategoryEntry();
    });
    vscode.commands.registerCommand('vscode-project-manager.openInNewWindow', (item) => {
        let projectPathUri = vscode.Uri.file(item.project._path);
        vscode.commands.executeCommand('vscode.openFolder', projectPathUri, {
            forceNewWindow: true
        });
    });
    vscode.commands.registerCommand('vscode-project-manager.openInWindow', (project) => {
        let projectObj = Project.getOneById(project);
        if (projectObj !== null) {
            let uri = vscode.Uri.file(projectObj._path);
            vscode.commands.executeCommand('vscode.openFolder', uri);
        }
    });
}
exports.activate = activate;
async function createProjectEntry() {
    if (vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders?.length > 0) {
        const projectNameInput = await vscode.window.showInputBox({
            placeHolder: 'Name',
            prompt: 'Please enter a name for the project that is shown in the sidebar'
        });
        if (projectNameInput !== undefined) {
            if (projectNameInput === '') {
                vscode.window.showErrorMessage('A name for the project is required.');
                return;
            }
            let treeStrings = Category.getTreeStrings();
            let quickpickOptions = ['No one'];
            treeStrings.forEach(function (value) {
                quickpickOptions.push(value._string);
            });
            const parentCategoryInput = await vscode.window.showQuickPick(quickpickOptions, {
                title: 'Enter a category name or leave it empty for no category'
            });
            // check which parent cat is selected
            let parentCatId = 0;
            treeStrings.forEach(function (value) {
                if (value._string === parentCategoryInput) {
                    parentCatId = value._catId;
                }
            });
            // get workspace opened folders
            let projectPaths = Array();
            vscode.workspace.workspaceFolders?.forEach(function (value) {
                projectPaths.push(value.uri.fsPath.toString());
            });
            let projectPath = projectPaths[0];
            let projectEntry = new Project(projectPath, projectNameInput, parentCatId);
            projectEntry.save();
            treeDataProvider.refresh();
        }
    }
    else {
        vscode.window.showErrorMessage('One folder must been added to current workspace to save it.');
    }
}
async function editCategoryEntry(categoryId) {
    let category = Category.getOneById(categoryId);
    if (category !== null) {
        const categoryNameInput = await vscode.window.showInputBox({
            placeHolder: 'Name',
            prompt: 'Please enter a name for the category that is shown in the sidebar',
            value: category?._name
        });
        if (categoryNameInput !== undefined) {
            if (categoryNameInput === '') {
                vscode.window.showErrorMessage('A name for the category is required.');
                return;
            }
            let treeStrings = Category.getTreeStrings();
            let quickpickOptions = ['No one'];
            treeStrings.forEach(function (value) {
                if (value._catId !== categoryId) {
                    quickpickOptions.push(value._string);
                }
            });
            const parentCategoryInput = await vscode.window.showQuickPick(quickpickOptions, {
                title: 'Select a parent category or No one for a root category'
            });
            // check which parent cat is selected
            let parentCatId = 0;
            treeStrings.forEach(function (value) {
                if (value._string === parentCategoryInput) {
                    parentCatId = value._catId;
                }
            });
            let categoryEntry = new Category(categoryNameInput, parentCatId);
            categoryEntry._id = category._id;
            categoryEntry.save();
            treeDataProvider.refresh();
        }
    }
}
async function editProjectEntry(projectId) {
    let project = Project.getOneById(projectId);
    if (project !== null) {
        const projectNameInput = await vscode.window.showInputBox({
            placeHolder: 'Name',
            prompt: 'Please enter a name for the project that is shown in the sidebar',
            value: project._name
        });
        if (projectNameInput !== undefined) {
            if (projectNameInput === '') {
                vscode.window.showErrorMessage('A name for the project is required.');
                return;
            }
            let treeStrings = Category.getTreeStrings();
            let quickpickOptions = ['No one'];
            treeStrings.forEach(function (value) {
                quickpickOptions.push(value._string);
            });
            const parentCategoryInput = await vscode.window.showQuickPick(quickpickOptions, {
                title: 'Enter a category name or leave it empty for no category'
            });
            // check which parent cat is selected
            let parentCatId = 0;
            treeStrings.forEach(function (value) {
                if (value._string === parentCategoryInput) {
                    parentCatId = value._catId;
                }
            });
            // get workspace opened folders
            let projectPaths = Array();
            vscode.workspace.workspaceFolders?.forEach(function (value) {
                projectPaths.push(value.uri.fsPath.toString());
            });
            let projectPath = projectPaths[0];
            let editProject = new Project(projectPath, projectNameInput, parentCatId);
            editProject._id = project._id;
            editProject.save();
            treeDataProvider.refresh();
        }
    }
}
async function createCategoryEntry() {
    const categoryNameInput = await vscode.window.showInputBox({
        placeHolder: 'Name',
        prompt: 'Please enter a name for the category that is shown in the sidebar'
    });
    if (categoryNameInput !== undefined) {
        if (categoryNameInput === '') {
            vscode.window.showErrorMessage('A name for the category is required.');
            return;
        }
        let treeStrings = Category.getTreeStrings();
        let quickpickOptions = ['No one'];
        treeStrings.forEach(function (value) {
            quickpickOptions.push(value._string);
        });
        const parentCategoryInput = await vscode.window.showQuickPick(quickpickOptions, {
            title: 'Select a parent category or No one for a root category'
        });
        // check which parent cat is selected
        let parentCatId = 0;
        treeStrings.forEach(function (value) {
            if (value._string === parentCategoryInput) {
                parentCatId = value._catId;
            }
        });
        let categoryEntry = new Category(categoryNameInput, parentCatId);
        categoryEntry.save();
        treeDataProvider.refresh();
    }
}
function deactivate() { }
exports.deactivate = deactivate;
class TreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.data = Category.getTreeItemsWithProjects();
    }
    refresh() {
        this.data = Category.getTreeItemsWithProjects();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element === undefined) {
            return this.data;
        }
        return element.children;
    }
}
class TreeItem extends vscode.TreeItem {
    constructor(label, children, project, category) {
        super(label, children === undefined ? vscode.TreeItemCollapsibleState.None :
            vscode.TreeItemCollapsibleState.Expanded);
        this.children = children;
        this.project = project;
        this.category = category;
        if (this.project === undefined) {
            this.iconPath = new vscode.ThemeIcon("layers");
            this.contextValue = 'TreeItemCategory';
        }
        else {
            this.iconPath = new vscode.ThemeIcon("folder");
            this.contextValue = 'TreeItemProject';
            this.command = {
                command: 'vscode-project-manager.openInWindow',
                title: 'openInWindow',
                arguments: [this.project?._id]
            };
        }
    }
}
class Project {
    constructor(path, name, categoryId = 0) {
        this._id = this.getNextId();
        this._path = path;
        this._name = name;
        this._categoryId = categoryId;
    }
    getNextId() {
        let latestId = 0;
        const existingProjects = Project.getAll();
        existingProjects.forEach(function (value) {
            if (value._id > latestId) {
                latestId = value._id;
            }
        });
        return latestId + 1;
    }
    save() {
        // check if folders and files exist
        Project.checkFolderandFiles();
        // read projects.json and add the project
        let existingProjects = Project.getAll();
        for (let i = 0; i < existingProjects.length; i++) {
            if (this._id === existingProjects[i]._id) {
                existingProjects.splice(i, 1);
            }
        }
        existingProjects.push(this);
        // write data to projects.json
        fs.writeFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'), JSON.stringify(existingProjects));
    }
    static deleteById(projectId) {
        // check if folders and files exist
        Project.checkFolderandFiles();
        // read projects.json and add the project
        let existingProjects = Project.getAll();
        for (let i = 0; i < existingProjects.length; i++) {
            if (existingProjects[i]._id === projectId) {
                existingProjects.splice(i, 1);
            }
        }
        // write data to projects.json
        fs.writeFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'), JSON.stringify(existingProjects));
    }
    static getOneById(projectId) {
        let projects = Project.getAll();
        let searchedProject = null;
        projects.forEach(function (value) {
            if (value._id === projectId) {
                searchedProject = value;
            }
        });
        return searchedProject;
    }
    static getAllByCategoryId(catId) {
        let projects = Project.getAll();
        let projectsByCat = [];
        projects.forEach(function (value) {
            if (value._categoryId === catId) {
                projectsByCat.push(value);
            }
        });
        return projectsByCat;
    }
    static getAll() {
        // check if folders and files exist
        Project.checkFolderandFiles();
        let existingProjects = JSON.parse(fs.readFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json')).toString());
        return existingProjects;
    }
    static checkFolderandFiles() {
        // create extension global storage folder if not exist
        if (!fs.existsSync(extensionContext.globalStorageUri.fsPath.toString())) {
            fs.mkdirSync(extensionContext.globalStorageUri.fsPath.toString());
        }
        // check if projects file exist and if not create it
        if (!fs.existsSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'))) {
            fs.writeFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'), JSON.stringify([]));
        }
    }
}
class Category {
    constructor(name, parentId) {
        this._id = this.getNextId();
        this._parentId = parentId;
        this._name = name;
        this.children = [];
    }
    save() {
        // check if folders and files exist
        Category.checkFolderandFiles();
        // read categories.json and add the category
        let existingCategories = Category.getAll();
        for (let i = 0; i < existingCategories.length; i++) {
            if (this._id === existingCategories[i]._id) {
                existingCategories.splice(i, 1);
            }
        }
        existingCategories.push(this);
        // write data to categories.json
        fs.writeFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'), JSON.stringify(existingCategories));
    }
    static deleteById(categoryId) {
        // check if folders and files exist
        Category.checkFolderandFiles();
        // read categories.json and remove the project
        let existingCategories = Category.getAll();
        for (let i = 0; i < existingCategories.length; i++) {
            if (existingCategories[i]._id === categoryId) {
                existingCategories.splice(i, 1);
            }
        }
        // write data to projects.json
        fs.writeFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'), JSON.stringify(existingCategories));
        // change projects category id if the current id is the deleted id
        let existingProjects = Project.getAll();
        existingProjects.forEach(function (value) {
            if (value._categoryId === categoryId) {
                value._categoryId = 0;
                value.save();
            }
        });
    }
    getNextId() {
        let latestId = 0;
        const existingCategories = Category.getAll();
        existingCategories.forEach(function (value) {
            if (value._id > latestId) {
                latestId = value._id;
            }
        });
        return latestId + 1;
    }
    static getTreeStrings() {
        let categories = Category.getAll();
        let strings = [];
        categories.forEach(function (value) {
            let arrowname = Category.createArrowName(value, categories);
            strings.push(new TreeString(arrowname, value._id));
        });
        return strings;
    }
    static createArrowName(category, categories) {
        let arrowname = category._name;
        if (category._parentId !== 0) {
            categories.forEach(function (value) {
                if (value._id === category._parentId) {
                    if (value._parentId !== 0) {
                        arrowname = Category.createArrowName(value, categories) + ' < ' + arrowname;
                    }
                    else {
                        arrowname = value._name + ' < ' + arrowname;
                    }
                }
            });
        }
        return arrowname;
    }
    static makeTree(categoryNodes) {
        const nodesMap = new Map(categoryNodes.map(node => [node._id, node]));
        const virtualRoot = {};
        categoryNodes.forEach((node, i) => {
            const parent = nodesMap.get(node._parentId) ?? virtualRoot;
            (parent.children ?? (parent.children = [])).push(node);
        });
        return virtualRoot.children ?? [];
    }
    static getTreeItemsWithProjects() {
        let catTree = Category.makeTree(Category.getAll());
        let treeItems = [];
        catTree.forEach(function (value) {
            treeItems.push(Category.createTreeItem(value));
        });
        // add tree items where not in a category
        let projects = Project.getAllByCategoryId(0);
        projects.forEach(function (value) {
            treeItems.push(new TreeItem(value._name, undefined, value));
        });
        return treeItems;
    }
    static createTreeItem(category) {
        let children = [];
        // add cat childs
        if (category.children !== undefined) {
            category.children.forEach(function (value) {
                children.push(Category.createTreeItem(value));
            });
        }
        // add project childs
        let projects = Project.getAllByCategoryId(category._id);
        projects.forEach(function (value) {
            children.push(new TreeItem(value._name, undefined, value));
        });
        let treeItem = new TreeItem(category._name, children, undefined, category);
        return treeItem;
    }
    static getAll() {
        // check if folders and files exist
        Category.checkFolderandFiles();
        let existingCategories = JSON.parse(fs.readFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json')).toString());
        return existingCategories;
    }
    static getOneById(categoryId) {
        let categories = Category.getAll();
        let searchedCategory = null;
        categories.forEach(function (value) {
            if (value._id === categoryId) {
                searchedCategory = value;
            }
        });
        return searchedCategory;
    }
    static checkFolderandFiles() {
        // create extension global storage folder if not exist
        if (!fs.existsSync(extensionContext.globalStorageUri.fsPath.toString())) {
            fs.mkdirSync(extensionContext.globalStorageUri.fsPath.toString());
        }
        // check if projects file exist and if not create it
        if (!fs.existsSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'))) {
            fs.writeFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'), JSON.stringify([]));
        }
    }
}
class TreeString {
    constructor(string, catId) {
        this._string = string;
        this._catId = catId;
    }
}
//# sourceMappingURL=extension.js.map