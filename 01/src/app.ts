enum ProjectStatus {
    Active,
    Finished,
}

class Project {
    id: number;
    title: string;
    description: string;
    people: number;
    status: ProjectStatus;

    constructor(
        id: number,
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
            this.projects.length + 1,
            title,
            desc,
            people,
            ProjectStatus.Active
        );
        this.projects.push(newProject);
        for (const listener of this.listeners) {
            listener(this.projects.slice());
        }
    }

    static getInstance(): ProjectState {
        if (this.instance) {
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
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

class ProjectList extends Component<HTMLDivElement, HTMLElement> {
    assignedProjects: Project[];

    constructor(private type: "active" | "finished") {
        super("project-list", "app", false, `${type}-projects`);
        this.assignedProjects = [];

        this.configure();
        this.renderContent();
    }

    renderContent(): void {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;
        this.element.querySelector("h2")!.textContent =
            this.type.toUpperCase() + " PROJECTS";
    }

    configure(): void {
        projectState.addListener((projects: Project[]) => {
            const sortedProjects = projects.filter((item) => {
                if (this.type === "active") {
                    return item.status === ProjectStatus.Active;
                }
                return item.status === ProjectStatus.Finished;
            });
            this.assignedProjects = sortedProjects;
            this.renderProjects();
        });
    }

    private renderProjects() {
        const list = document.getElementById(`${this.type}-projects-list`)!;
        list.innerHTML = "";
        for (const project of this.assignedProjects) {
            const listItem = document.createElement("li");
            listItem.textContent = project.title;
            list.appendChild(listItem);
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
