import { Todo, TodoListApi } from "client";
import Vue from "vue";
import { Component, Prop } from "vue-property-decorator";
import AutoComplete from "./autocomplete.vue";
import { Button, ButtonGroup, Col, Row } from "./elements";

function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function normalize(s: string) {
    return s.trim().toLowerCase().split(/\s+/).join(" ");
}

@Component({
    components: {
        AutoComplete,
        [Button.name]: Button,
        [ButtonGroup.name]: ButtonGroup,
        [Col.name]: Col,
        [Row.name]: Row,
    },
})
export default class Todolist extends Vue {
    @Prop()
    readonly basePath!: string;
    @Prop()
    readonly suggestions!: string[];

    changed = false;
    newTodo = "";
    todos: Todo[] = [];

    private todoList: Todo[] = [];
    private todoListApi = new TodoListApi(undefined, this.basePath, fetch);

    async mounted() {
        this.todoList = await this.todoListApi.todos();
        this.todos = clone(this.todoList);
    }

    get openTodos() {
        return this.todos.filter((t) => !t.completed);
    }

    get doneTodos() {
        return this.todos.filter((t) => t.completed);
    }

    get valid() {
        return this.newTodo.length > 3;
    }

    get openSuggestions() {
        return this.suggestions.filter((s) => !this.todos.some((t) => normalize(t.title) === normalize(s)));
    }

    close(todo: Todo) {
        todo.completed = true;
        this.changed = true;
    }

    open(todo: Todo) {
        todo.completed = false;
        this.changed = true;
    }

    remove(todo: Todo) {
        this.todos.splice(this.todos.indexOf(todo), 1);
        this.changed = true;
    }

    closeAll() {
        this.todos.forEach((todo) => {
            todo.completed = true;
        });
        this.changed = true;
    }

    addNewTodo() {
        if (this.valid) {
            this.todos.push({
                completed: false,
                title: this.newTodo,
            });
            this.newTodo = "";
            this.changed = true;
        }
    }

    reset() {
        this.todos = clone(this.todoList);
        this.changed = false;
    }

    async save() {
        try {
            await this.todoListApi.overwriteTodos(this.todos);
        } catch (error) {
            if (error instanceof Response) {
                const response: Response = error;
                if (response.status === 409) {
                    if (!confirm(await response.text())) {
                        return;
                    }
                } else {
                    throw response;
                }
            } else {
                throw error;
            }
        }
        this.todoList = await this.todoListApi.todos();
        this.todos = clone(this.todoList);
        this.changed = false;
    }
}
