/**
 * To get property value of an object like src[property].
 * "../" to go up one level.
 * "." or "" to return src itself.
 * "a.b.c" to go deeper into child object. e.g. { a: { b: {c: value } } }
 * "a?b" to get a first. If a is null, then return b.
 */
export class SrcObject {

    public get src() { return this._src; }
    public get parent() { return this._parent; }
    public get isRoot() { return !this._parent; }

    private _src: any;
    private _parent?: SrcObject;

    constructor(src: any, parent?: SrcObject) {
        this._src = src;
        this._parent = parent;
    }

    public getPropertyValue(property: string): any {
        const { src } = this;
        if (Array.isArray(src)) {
            const values = [];
            for (const item of src) {
                const value = new SrcObject(item, this.parent).getPropertyValue(property);
                values.push(value);
            }
            return values;
        } else {
            let value = null;
            const tokens = property.split("?");
            for (const prop of tokens) {
                value = this._getPropertyValue(prop);
                if (value !== undefined) {
                    return value;
                }
            }
            return value;
        }
    }

    private _getPropertyValue(property: string): any {
        // if "." or "", return the value itself
        if (property === "." || property === "") {
            return this.src;
        }

        // if it is a constant 'value', return value
        if (property.match(/'[\w\d-\s]+'/)) {
            return property.replace(new RegExp("'", "g"), "");
        }

        // if there is "../" at the beginning, go to parent level.
        if (property.startsWith("../")) {
            property = property.replace("../", "");
            return (this.parent) ? this.parent.getPropertyValue(property) : null;
        }

        // navigate value. e.g. propA.propB.propC
        const tokens = property.split(".");
        if (tokens.length > 1) {
            const child = tokens[0];
            tokens.shift(); // remove the first element
            return new SrcObject(this.src[child], this).getPropertyValue(tokens.join("."));
        }

        return this.src[property];
    }
}
