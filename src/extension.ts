import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let extensionContext: vscode.ExtensionContext;
let treeDataProvider: TreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
	
	extensionContext = context;
	treeDataProvider = new TreeDataProvider();

	context.subscriptions.push(vscode.window.createTreeView('projectManagerTreeView', {
		treeDataProvider: treeDataProvider,
		dragAndDropController: new DragAndDropController()
	}));

	// item is undefined when called from the view title or the command palette
	context.subscriptions.push(vscode.commands.registerCommand('vscode-project-manager.addProject', (item?: TreeItem) => {
		createProjectEntry(item?.category?._id ?? 0);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-project-manager.addCategory', (item?: TreeItem) => {
		createCategoryEntry(item?.category?._id ?? 0);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-project-manager.renameEntry', (item) => {
		
		if(item.project === undefined && item.category !== undefined){
			// rename category
			renameCategoryEntry(item.category);
		} else if(item.project !== undefined && item.category === undefined){
			// rename project
			renameProjectEntry(item.project);
		}

	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-project-manager.deleteEntry', (item) => {
		
		vscode.window.showWarningMessage("Do you really want to delete this?", { modal: true }, "Yes").then(answer => {
			if (answer === "Yes") {
				if(item.project === undefined && item.category !== undefined){
					// delete category
					Category.deleteById(item.category._id);
				} else if(item.project !== undefined && item.category === undefined){
					// delete project
					Project.deleteById(item.project._id);
				}
				treeDataProvider.refresh();
			}
		});

	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-project-manager.openInNewWindow', (item) => {
		
		let projectPathUri = vscode.Uri.file(item.project._path);
		vscode.commands.executeCommand('vscode.openFolder', projectPathUri, {
			forceNewWindow: true
		});

	}));

	context.subscriptions.push(vscode.commands.registerCommand('vscode-project-manager.openInWindow', (project) => {
		
		let projectObj = Project.getOneById(project);

		if(projectObj !== null){

			let uri = vscode.Uri.file(projectObj._path);
			vscode.commands.executeCommand('vscode.openFolder', uri);

		}

	}));

}

async function askForName(prompt: string, value?: string){

	const nameInput = await vscode.window.showInputBox({
		placeHolder: 'Name',
		prompt: prompt,
		value: value
	});

	if(nameInput === ''){
		vscode.window.showErrorMessage('A name is required.');
		return undefined;
	}

	return nameInput;

}

async function createProjectEntry(categoryId: number){

	const folders = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
		openLabel: 'Select Project Folder'
	});

	if(folders === undefined){
		return;
	}

	const projectPath = folders[0].fsPath;
	const projectNameInput = await askForName('Please enter a name for the project that is shown in the sidebar', path.basename(projectPath));

	if(projectNameInput !== undefined){

		let projectEntry = new Project(projectPath, projectNameInput, categoryId);
		projectEntry.save();

		treeDataProvider.refresh();

	}

}

async function createCategoryEntry(parentId: number){

	const categoryNameInput = await askForName('Please enter a name for the category that is shown in the sidebar');

	if(categoryNameInput !== undefined){

		let categoryEntry = new Category(categoryNameInput, parentId);
		categoryEntry.save();

		treeDataProvider.refresh();

	}

}

async function renameProjectEntry(project: Project){

	const projectNameInput = await askForName('Please enter a new name for the project', project._name);

	if(projectNameInput !== undefined){

		let renamedProject = new Project(project._path, projectNameInput, project._categoryId);
		renamedProject._id = project._id;
		renamedProject.save();

		treeDataProvider.refresh();

	}

}

async function renameCategoryEntry(category: Category){

	const categoryNameInput = await askForName('Please enter a new name for the category', category._name);

	if(categoryNameInput !== undefined){

		let renamedCategory = new Category(categoryNameInput, category._parentId);
		renamedCategory._id = category._id;
		renamedCategory.save();

		treeDataProvider.refresh();

	}

}

export function deactivate() {}

// true if categoryId is ancestorId itself or lies somewhere below it
export function isSameOrDescendant(categories: Array<{ _id: number, _parentId: number }>, categoryId: number, ancestorId: number): boolean {

	let currentId = categoryId;
	while(currentId !== 0){
		if(currentId === ancestorId){
			return true;
		}
		currentId = categories.find(value => value._id === currentId)?._parentId ?? 0;
	}

	return false;

}

class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
	refresh(): void {
		this.data = Category.getTreeItemsWithProjects();
	  	this._onDidChangeTreeData.fire();
	}

	data: TreeItem[];
  
	constructor() {
		this.data = Category.getTreeItemsWithProjects();
	}
  
	getTreeItem(element: TreeItem): vscode.TreeItem|Thenable<vscode.TreeItem> {
	  	return element;
	}
  
	getChildren(element?: TreeItem|undefined): vscode.ProviderResult<TreeItem[]> {
	  	if(element === undefined){
			return this.data;
	  	}
	  	return element.children;
	}

}

class DragAndDropController implements vscode.TreeDragAndDropController<TreeItem> {

	private static readonly mimeType = 'application/vnd.code.tree.projectmanagertreeview';
	readonly dragMimeTypes = [DragAndDropController.mimeType];
	readonly dropMimeTypes = [DragAndDropController.mimeType];

	handleDrag(source: readonly TreeItem[], dataTransfer: vscode.DataTransfer): void {
		dataTransfer.set(DragAndDropController.mimeType, new vscode.DataTransferItem(source));
	}

	handleDrop(target: TreeItem | undefined, dataTransfer: vscode.DataTransfer): void {

		const items: readonly TreeItem[] | undefined = dataTransfer.get(DragAndDropController.mimeType)?.value;
		if(items === undefined){
			return;
		}

		// dropping on a project moves into that project's category, dropping on empty space moves to root
		const targetCategoryId = target?.category?._id ?? target?.project?._categoryId ?? 0;

		items.forEach(function(item){
			if(item.project !== undefined){
				let movedProject = new Project(item.project._path, item.project._name, targetCategoryId);
				movedProject._id = item.project._id;
				movedProject.save();
			} else if(item.category !== undefined && !isSameOrDescendant(Category.getAll(), targetCategoryId, item.category._id)){
				let movedCategory = new Category(item.category._name, targetCategoryId);
				movedCategory._id = item.category._id;
				movedCategory.save();
			}
		});

		treeDataProvider.refresh();

	}

}
  
class TreeItem extends vscode.TreeItem {
	
	children: TreeItem[]|undefined;
	project?: Project;
	category?: Category;
  
	constructor(label: string, children?: TreeItem[], project?: Project, category?: Category) {
	  	super(
		  	label,
		  	children === undefined ? vscode.TreeItemCollapsibleState.None :
										vscode.TreeItemCollapsibleState.Expanded
		);
	 	this.children = children;
	  	this.project = project;
		this.category = category;
		
		if(this.project === undefined){
			this.iconPath = new vscode.ThemeIcon("folder");
			this.contextValue = 'TreeItemCategory';
		} else {
			this.iconPath = new vscode.ThemeIcon("repo");
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

	_id: number;
	_path: string;
	_name: string;
	_categoryId: number;

	constructor(path: string, name: string, categoryId: number = 0){
		this._id = this.getNextId();
		this._path = path;
		this._name = name;
		this._categoryId = categoryId;
	}

	private getNextId(){

		let latestId = 0;
		const existingProjects = Project.getAll();
		existingProjects.forEach(function(value){
			if(value._id > latestId){
				latestId = value._id;
			}
		});

		return latestId + 1;

	}

	save(){

		// check if folders and files exist
		Project.checkFolderandFiles();
		
		// read projects.json and add the project
		let existingProjects:Array<Project> = Project.getAll();
		for(let i = 0; i < existingProjects.length; i++){
			if(this._id === existingProjects[i]._id){
				existingProjects.splice(i,1);
			}
		}
		
		existingProjects.push(this);

		// write data to projects.json
		fs.writeFileSync(
			path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'),
			JSON.stringify(existingProjects));

	}

	public static deleteById(projectId:number){

		// check if folders and files exist
		Project.checkFolderandFiles();
		
		// read projects.json and add the project
		let existingProjects:Array<Project> = Project.getAll();
		for(let i = 0; i < existingProjects.length; i++){
			if(existingProjects[i]._id === projectId){
				existingProjects.splice(i,1);
			}
		}

		// write data to projects.json
		fs.writeFileSync(
			path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'),
			JSON.stringify(existingProjects));

	}

	public static getOneById(projectId: number):Project|null {

		let projects: Array<Project> = Project.getAll();
		let searchedProject = null;
		projects.forEach(function(value){
			if(value._id === projectId){
				searchedProject = value;
			}
		});

		return searchedProject;

	}

	public static getAllByCategoryId(catId: number){

		let projects: Array<Project> = Project.getAll();
		let projectsByCat: Array<Project> = [];
		projects.forEach(function(value){
			if(value._categoryId === catId){
				projectsByCat.push(value);
			}
		});

		return projectsByCat;

	}

	public static getAll(){

		// check if folders and files exist
		Project.checkFolderandFiles();

		let existingProjects:Array<Project> = JSON.parse(fs.readFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json')).toString());
		return existingProjects;

	}

	public static checkFolderandFiles(){

		// create extension global storage folder if not exist
		if (!fs.existsSync(extensionContext.globalStorageUri.fsPath.toString())) {
			fs.mkdirSync(extensionContext.globalStorageUri.fsPath.toString());
		}

		// check if projects file exist and if not create it
		if (!fs.existsSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'))) {
			fs.writeFileSync(
				path.join(extensionContext.globalStorageUri.fsPath.toString(), 'projects.json'),
				JSON.stringify([]));
		}

	}

}

class Category {

	_id: number;
	_parentId: number;
	_name: string;
	children: Array<Category>;

	constructor(name: string, parentId: number){

		this._id = this.getNextId();
		this._parentId = parentId;
		this._name = name;
		this.children = [];

	}

	save(){

		// check if folders and files exist
		Category.checkFolderandFiles();
		
		// read categories.json and add the category
		let existingCategories:Array<Category> = Category.getAll();
		for(let i = 0; i < existingCategories.length; i++){
			if(this._id === existingCategories[i]._id){
				existingCategories.splice(i,1);
			}
		}

		existingCategories.push(this);

		// write data to categories.json
		fs.writeFileSync(
			path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'),
			JSON.stringify(existingCategories));

	}

	public static deleteById(categoryId:number){

		// check if folders and files exist
		Category.checkFolderandFiles();
		
		// read categories.json and remove the project
		let existingCategories:Array<Category> = Category.getAll();
		for(let i = 0; i < existingCategories.length; i++){
			if(existingCategories[i]._id === categoryId){
				existingCategories.splice(i,1);
			}
		}

		// write data to projects.json
		fs.writeFileSync(
			path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'),
			JSON.stringify(existingCategories));

		// change projects category id if the current id is the deleted id
		let existingProjects:Array<Project> = Project.getAll();
		existingProjects.forEach(function(value){
			if(value._categoryId === categoryId){
				let movedProject = new Project(value._path, value._name, 0);
				movedProject._id = value._id;
				movedProject.save();
			}
		});

	}

	private getNextId(){

		let latestId = 0;
		const existingCategories = Category.getAll();
		existingCategories.forEach(function(value){
			if(value._id > latestId){
				latestId = value._id;
			}
		});

		return latestId + 1;

	}

	private static makeTree(categoryNodes: Category[]): Category[] {

		const nodesMap = new Map<number, Category>(
			categoryNodes.map(node => [node._id, node])
		);
	
		const virtualRoot = { } as Partial<Category>;
		categoryNodes.forEach((node, i) => {
			const parent = nodesMap.get(node._parentId) ?? virtualRoot;
			(parent.children ??= []).push(node);
		});
	
		return virtualRoot.children ?? [];
	}

	public static getTreeItemsWithProjects(){

		let catTree: Array<Category> = Category.makeTree(Category.getAll());
		let treeItems:Array<TreeItem> = [];
		catTree.forEach(function(value){
			treeItems.push(Category.createTreeItem(value));
		});
		// add tree items where not in a category
		let projects = Project.getAllByCategoryId(0);
		projects.forEach(function(value){
			treeItems.push(new TreeItem(value._name, undefined, value));
		});

		return treeItems;

	}

	private static createTreeItem(category: Category){

		let children:Array<TreeItem> = [];
		// add cat childs
		if(category.children !== undefined){
			category.children.forEach(function(value){
				children.push(Category.createTreeItem(value));
			});
		}
		// add project childs
		let projects = Project.getAllByCategoryId(category._id);
		projects.forEach(function(value){
			children.push(new TreeItem(value._name, undefined, value));
		});

		let treeItem = new TreeItem(category._name, children, undefined, category);
		return treeItem;

	}

	public static getAll(){

		// check if folders and files exist
		Category.checkFolderandFiles();

		let existingCategories:Array<Category> = JSON.parse(fs.readFileSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json')).toString());
		return existingCategories;

	}

	public static getOneById(categoryId: number):Category|null {

		let categories: Array<Category> = Category.getAll();
		let searchedCategory = null;
		categories.forEach(function(value){
			if(value._id === categoryId){
				searchedCategory = value;
			}
		});

		return searchedCategory;

	}

	public static checkFolderandFiles(){

		// create extension global storage folder if not exist
		if (!fs.existsSync(extensionContext.globalStorageUri.fsPath.toString())) {
			fs.mkdirSync(extensionContext.globalStorageUri.fsPath.toString());
		}

		// check if projects file exist and if not create it
		if (!fs.existsSync(path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'))) {
			fs.writeFileSync(
				path.join(extensionContext.globalStorageUri.fsPath.toString(), 'categories.json'),
				JSON.stringify([]));
		}

	}

}
