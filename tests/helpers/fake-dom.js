export class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.disabled = false;
    this.value = "";
    this.focused = false;
    this._textContent = "";
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent ?? String(child)).join("");
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  set innerHTML(_value) {
    throw new Error("Tests prohibit innerHTML writes");
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.append(child);
    return child;
  }

  replaceChildren(...children) {
    this._textContent = "";
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  focus() {
    this.focused = true;
  }
}

export class FakeDocument {
  createElement(tagName) {
    return new FakeElement(tagName, this);
  }
}

export function createContainer() {
  const documentRef = new FakeDocument();
  return new FakeElement("section", documentRef);
}
