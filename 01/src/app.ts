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

class ProjectList {
    templateElement: HTMLTemplateElement;
    hostElement: HTMLDivElement;
    element: HTMLElement;
    constructor(private type: "active" | "finished") {
        this.templateElement = <HTMLTemplateElement>(
            document.getElementById("project-list")!
        );
        this.hostElement = <HTMLDivElement>document.getElementById("app")!;

        const importedNode = document.importNode(
            this.templateElement.content,
            true
        );
        this.element = <HTMLElement>importedNode.firstElementChild;
        this.element.id = `${this.type}-projects`;
        this.attach();
        this.renderContent();
    }

    private renderContent(): void {
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;
        this.element.querySelector("h2")!.textContent =
            this.type.toUpperCase() + " PROJECTS";
    }

    private attach(): void {
        this.hostElement.insertAdjacentElement("beforeend", this.element);
    }
}

class ProjectInput {
    templateElement: HTMLTemplateElement;
    hostElement: HTMLDivElement;
    element: HTMLFormElement;
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;

    constructor() {
        this.templateElement = <HTMLTemplateElement>(
            document.getElementById("project-input")!
        );
        this.hostElement = <HTMLDivElement>document.getElementById("app")!;

        const importedNode = document.importNode(
            this.templateElement.content,
            true
        );
        this.element = <HTMLFormElement>importedNode.firstElementChild;
        this.element.id = "user-input";

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
        this.attach();
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
            console.log(title, description, people);
            this.clearInput();
        }
    }

    private configure(): void {
        this.element.addEventListener("submit", this.submitHandler);
    }

    private attach(): void {
        this.hostElement.insertAdjacentElement("afterbegin", this.element);
    }
}

const projectInput = new ProjectInput();
const activeProjectsList = new ProjectList("active");
const finishedProjectsList = new ProjectList("finished");
