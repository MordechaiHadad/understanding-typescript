interface Draggable {
    dragstartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}

interface DragTraget {
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}

enum ProjectStatus {
    Active,
    Finished,
}

class Project {
    id: string;
    title: string;
    description: string;
    people: number;
    status: ProjectStatus;

    constructor(
        id: string,
        title: string,
        description: string,
        people: number,
        status: ProjectStatus
    ) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.people = people;
        this.status = status;
    }
}

type Listener<T> = (items: T[]) => void;

class State<T> {
    protected listeners: Listener<T>[] = [];

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn);
    }
}

class ProjectState extends State<Project> {
    // Using inheritence here is such a dumb practice...
    private projects: Project[] = [];
    private static instance: ProjectState;

    private constructor() {
        super();
    }

    addProject(title: string, desc: string, people: number) {
        const newProject = new Project(
            `${this.projects.length + 1}`,
            title,
            desc,
            people,
            ProjectStatus.Active
        );
        this.projects.push(newProject);
        this.updateListeners();
    }

    static getInstance(): ProjectState {
        if (this.instance) {
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find((project) => project.id === projectId);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
            this.updateListeners();
        }
    }

    private updateListeners() {
        for (const listener of this.listeners) {
            listener(this.projects.slice());
        }
    }
}

const projectState = ProjectState.getInstance();

interface Validateable {
    value?: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate(input: Validateable) {
    let isValid = true;

    if (input.required) {
        isValid = isValid && input.value?.toString().trim().length !== 0;
    }

    if (input.minLength != null && typeof input.value === "string") {
        isValid = isValid && input.value.length > input.minLength;
    }

    if (input.maxLength != null && typeof input.value === "string") {
        isValid = isValid && input.value.length < input.maxLength;
    }

    if (input.min != null && typeof input.value === "number") {
        isValid = isValid && input.value >= input.min;
    }
    if (input.max != null && typeof input.value === "number") {
        isValid = isValid && input.value <= input.max;
    }
    return isValid;
}

function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        get() {
            const boundFn = originalMethod.bind(this);
            return boundFn;
        },
    };
    return adjDescriptor;
}

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
        templateId: string,
        hostElementId: string,
        insertAtStart: boolean,
        newElementId?: string
    ) {
        this.templateElement = <HTMLTemplateElement>(
            document.getElementById(templateId)!
        );
        this.hostElement = <T>document.getElementById(hostElementId)!;

        const importedNode = document.importNode(
            this.templateElement.content,
            true
        );
        this.element = <U>importedNode.firstElementChild;
        if (newElementId) {
            this.element.id = newElementId;
        }

        this.attach(insertAtStart);
    }

    private attach(insertAtStart: boolean): void {
        this.hostElement.insertAdjacentElement(
            insertAtStart ? "afterbegin" : "beforeend",
            this.element
        );
    }

    abstract configure(): void;
    abstract renderContent(): void;
}

class ProjectItem
    extends Component<HTMLUListElement, HTMLLIElement>
    implements Draggable {
    private project: Project;

    get people() {
        return this.project.people === 1
            ? "1 person"
            : `${this.project.people} people`;
    }

    constructor(hostId: string, project: Project) {
        super("single-project", hostId, false, project.id);
        this.project = project;

        this.configure();
        this.renderContent();
    }

    @autobind
    dragstartHandler(event: DragEvent): void {
        event.dataTransfer!.setData("text/plain", this.project.id);
        event.dataTransfer!.effectAllowed = "move";
    }

    @autobind
    dragEndHandler(_: DragEvent): void {
        console.log("DragEnd");
    }

    configure() {
        this.element.addEventListener("dragstart", this.dragstartHandler);
        this.element.addEventListener("dragend", this.dragEndHandler);
    }

    renderContent() {
        this.element.querySelector("h2")!.textContent = this.project.title;
        this.element.querySelector("h3")!.textContent = this.people + " assigned";
        this.element.querySelector("p")!.textContent = this.project.description;
    }
}

class ProjectList
    extends Component<HTMLDivElement, HTMLElement>
    implements DragTraget {
    assignedProjects: Project[];

    constructor(private type: "active" | "finished") {
        super("project-list", "app", false, `${type}-projects`);
        this.assignedProjects = [];

        this.configure();
        this.renderContent();
    }

    @autobind
    dragOverHandler(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
            const list = this.element.querySelector("ul")!;
            list.classList.add("droppable");
        }
    }

    @autobind
    dropHandler(event: DragEvent): void {
        const projectId = event.dataTransfer!.getData("text/plain");
        projectState.moveProject(
            projectId,
            this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
        );
    }

    @autobind
    dragLeaveHandler(_: DragEvent): void {
        const list = this.element.querySelector("ul")!;
        list.classList.remove("droppable");
    }

    configure() {
        this.element.addEventListener("dragover", this.dragOverHandler);
        this.element.addEventListener("dragleave", this.dragLeaveHandler);
        this.element.addEventListener("drop", this.dropHandler);

        projectState.addListener((projects: Project[]) => {
            const relevantProjects = projects.filter((prj) => {
                if (this.type === "active") {
                    return prj.status === ProjectStatus.Active;
                }
                return prj.status === ProjectStatus.Finished;
            });
            this.assignedProjects = relevantProjects;
            this.renderProjects();
        });
    }

    renderContent() {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;
        this.element.querySelector("h2")!.textContent =
            this.type.toUpperCase() + " PROJECTS";
    }

    private renderProjects() {
        const listEl = document.getElementById(
            `${this.type}-projects-list`
        )! as HTMLUListElement;
        listEl.innerHTML = "";
        for (const project of this.assignedProjects) {
            new ProjectItem(this.element.querySelector("ul")!.id, project);
        }
    }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
        super("project-input", "app", true, "user-input");

        this.titleInputElement = <HTMLInputElement>(
            this.element.querySelector("#title")
        );
        this.descriptionInputElement = <HTMLInputElement>(
            this.element.querySelector("#description")
        );
        this.peopleInputElement = <HTMLInputElement>(
            this.element.querySelector("#people")
        );

        this.configure();
    }

    configure(): void {
        this.element.addEventListener("submit", this.submitHandler);
    }

    renderContent(): void {
        throw new Error("Method not implemented.");
    }

    private gatherUserInput(): [string, string, number] | void {
        const title = this.titleInputElement.value;
        const description = this.descriptionInputElement.value;
        const people = this.peopleInputElement.value;

        const titleValidate: Validateable = { value: title, required: true };
        const descriptionValidate: Validateable = {
            value: description,
            required: true,
            minLength: 5,
        };
        const peopleValidate: Validateable = {
            value: +people,
            required: true,
            min: 1,
            max: 5,
        };

        if (
            !validate(titleValidate) ||
            !validate(descriptionValidate) ||
            !validate(peopleValidate)
        ) {
            alert("invalid input, please try again");
            return;
        } else {
            return [title, description, +people];
        }
    }

    private clearInput(): void {
        this.titleInputElement.value = "";
        this.peopleInputElement.value = "";
        this.descriptionInputElement.value = "";
    }

    @autobind
    private submitHandler(event: Event): void {
        event.preventDefault();
        const userInput = this.gatherUserInput();
        if (Array.isArray(userInput)) {
            const [title, description, people] = userInput;
            projectState.addProject(title, description, people);
            this.clearInput();
        }
    }
}

const projectInput = new ProjectInput();
const activeProjectsList = new ProjectList("active");
const finishedProjectsList = new ProjectList("finished");
