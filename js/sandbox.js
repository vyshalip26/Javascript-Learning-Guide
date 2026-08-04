// sandbox.js
// Handles safe iframe execution, custom terminal output, and rigorous test validation

function getGlobalSymbol(win, name) {
    if (typeof win[name] !== 'undefined') return win[name];
    try {
        return win.eval(`typeof ${name} !== 'undefined' ? ${name} : undefined`);
    } catch (e) {
        return undefined;
    }
}

const LessonTests = {
    't1-memory-layout': function(win) {
        if (typeof win.deepClone !== 'function') {
            return { passed: false, message: "Function 'deepClone(obj)' is not defined." };
        }
        const orig = { num: 42, str: "y2k", nested: { val: true }, arr: [1, 2] };
        const cloned = win.deepClone(orig);
        
        if (!cloned || cloned === orig) {
            return { passed: false, message: "deepClone must return a NEW object reference, not the same reference." };
        }
        if (!cloned.nested || cloned.nested === orig.nested) {
            return { passed: false, message: "Nested objects must be cloned by value, not by reference (cloned.nested === orig.nested)." };
        }
        if (!Array.isArray(cloned.arr) || cloned.arr === orig.arr) {
            return { passed: false, message: "Arrays inside object must be cloned as distinct new array references." };
        }
        if (cloned.num !== 42 || cloned.nested.val !== true || cloned.arr[1] !== 2) {
            return { passed: false, message: "Cloned object values do not match original values." };
        }
        return { passed: true, message: "Successfully performed a true deep copy across stack and heap allocations!" };
    },

    't1-hoisting': function(win) {
        if (typeof win.scopeChallenge !== 'function') {
            return { passed: false, message: "Function 'scopeChallenge()' is not defined." };
        }
        const res = win.scopeChallenge();
        if (!res || res.hoistedVar !== undefined) {
            return { passed: false, message: "Expected 'hoistedVar' to equal undefined before initialization due to var hoisting." };
        }
        if (!res.tdzHandled) {
            return { passed: false, message: "Temporal Dead Zone (TDZ) for let/const was not properly handled or caught." };
        }
        if (res.loopResult !== 45) {
            return { passed: false, message: `Expected loopResult to be 45 (sum of 0..9 using block scoping), but got ${res.loopResult}.` };
        }
        return { passed: true, message: "Mastered Hoisting, Lexical Scope, and TDZ handling!" };
    },

    't1-closures': function(win) {
        if (typeof win.createEncapsulatedState !== 'function') {
            return { passed: false, message: "Function 'createEncapsulatedState(initial)' is not defined." };
        }
        const store = win.createEncapsulatedState(100);
        if (!store || typeof store.getValue !== 'function' || typeof store.setValue !== 'function') {
            return { passed: false, message: "Returned object must have 'getValue()' and 'setValue(val)' methods." };
        }
        if (store.getValue() !== 100) {
            return { passed: false, message: `getValue() returned ${store.getValue()}, expected initial value 100.` };
        }
        store.setValue(250);
        if (store.getValue() !== 250) {
            return { passed: false, message: `setValue(250) failed, getValue() returned ${store.getValue()}.` };
        }
        if (store._state !== undefined || store.val !== undefined) {
            return { passed: false, message: "Private state variable leaked on returned object! Use local closure variable." };
        }
        if (typeof store.getHistory !== 'function' || !Array.isArray(store.getHistory())) {
            return { passed: false, message: "Method 'getHistory()' must return an array of past values." };
        }
        return { passed: true, message: "Closure encapsulation & private state successfully implemented!" };
    },

    't1-this-keyword': function(win) {
        if (typeof win.myBind !== 'function' && typeof win.Function.prototype.myBind !== 'function') {
            return { passed: false, message: "Custom bind implementation 'myBind' or 'Function.prototype.myBind' is not defined." };
        }
        const testFunc = win.Function(
            "a",
            "b",
            "return `${this.prefix}_${a}_${b}`;"
        );
        const ctx = { prefix: "CHIC" };
        let bound;
        if (win.Function.prototype.myBind) {
            bound = testFunc.myBind(ctx, "ARG1");
        } else {
            bound = win.myBind(testFunc, ctx, "ARG1");
        }
        const result = bound("ARG2");
        if (result !== "CHIC_ARG1_ARG2") {
            return { passed: false, message: `Expected bound call to return 'CHIC_ARG1_ARG2', got '${result}'.` };
        }
        return { passed: true, message: "Explicit binding with context & partial application (myBind) verified!" };
    },

    't1-prototypes': function(win) {
        if (typeof win.EventEmitter !== 'function') {
            return { passed: false, message: "Constructor or class 'EventEmitter' is not defined." };
        }
        if (!win.EventEmitter.prototype.on || !win.EventEmitter.prototype.emit) {
            return { passed: false, message: "'on' and 'emit' methods must be defined on EventEmitter.prototype." };
        }
        const ee = new win.EventEmitter();
        let count = 0;
        ee.on('ping', (val) => { count += val; });
        ee.emit('ping', 5);
        ee.emit('ping', 10);
        if (count !== 15) {
            return { passed: false, message: `Expected listener to be called with emitted args accumulating to 15, got ${count}.` };
        }
        return { passed: true, message: "Prototypal inheritance & event emitter architecture verified!" };
    },

    't1-higher-order': function(win) {
        if (typeof win.compose !== 'function') {
            return { passed: false, message: "Function 'compose(...fns)' is not defined." };
        }
        const double = x => x * 2;
        const addTen = x => x + 10;
        const square = x => x * x;
        const fn = win.compose(square, addTen, double);
        const val = fn(3);
        if (val !== 256) {
            return { passed: false, message: `Expected right-to-left composition compose(square, addTen, double)(3) to return 256, got ${val}.` };
        }
        return { passed: true, message: "Functional composition pipeline successfully created!" };
    },

    't1-event-loop': function(win) {
        const runEventLoopSequence = getGlobalSymbol(win, 'runEventLoopSequence');
        if (typeof runEventLoopSequence !== 'function') {
            return { passed: false, message: "Function 'runEventLoopSequence()' is not defined." };
        }
        const res = runEventLoopSequence();
        const expected = ['1-sync', '2-sync', '3-microtask', '4-microtask', '5-macrotask'];
        return Promise.resolve(res).then(seq => {
            return new Promise(resolve => {
                setTimeout(() => {
                    if (!Array.isArray(seq)) {
                        resolve({ passed: false, message: "runEventLoopSequence() must return an array (or a Promise resolving to an array) of sequence labels." });
                        return;
                    }
                    if (JSON.stringify(seq) !== JSON.stringify(expected)) {
                        resolve({ passed: false, message: `Incorrect queue ordering. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(seq)}.` });
                    } else {
                        resolve({ passed: true, message: "Event Loop microtask vs macrotask execution sequence mastered!" });
                    }
                }, 50);
            });
        });
    },

    't2-critical-rendering': function(win) {
        if (typeof win.batchDomOperations !== 'function') {
            return { passed: false, message: "Function 'batchDomOperations(container, items)' is not defined." };
        }
        const container = win.document.createElement('div');
        const items = ["Node 1", "Node 2", "Node 3"];
        const res = win.batchDomOperations(container, items);
        if (container.children.length !== 3) {
            return { passed: false, message: `Expected container to have 3 children, got ${container.children.length}.` };
        }
        if (!res || !res.usedFragment) {
            return { passed: false, message: "batchDomOperations must utilize DocumentFragment to prevent reflow triggers! Return { usedFragment: true }." };
        }
        return { passed: true, message: "Optimized Critical Rendering Path with zero unnecessary layout reflows!" };
    },

    't2-dom-manipulation': function(win) {
        if (typeof win.createNestedTree !== 'function') {
            return { passed: false, message: "Function 'createNestedTree(data)' is not defined." };
        }
        const treeData = {
            name: "Root",
            children: [
                { name: "Child 1" },
                { name: "Child 2", children: [{ name: "Grandchild 2.1" }] }
            ]
        };
        const rootEl = win.createNestedTree(treeData);
        if (!rootEl || (rootEl.tagName !== 'UL' && rootEl.tagName !== 'LI')) {
            return { passed: false, message: "Function must return a valid HTML DOM element (UL/LI)." };
        }
        const items = rootEl.querySelectorAll('li');
        if (items.length !== 4) {
            return { passed: false, message: `Expected 4 list items (Root + 2 Children + 1 Grandchild), found ${items.length}.` };
        }
        return { passed: true, message: "Dynamic recursive DOM tree construction verified!" };
    },

    't2-events': function(win) {
        if (typeof win.setupEventDelegation !== 'function') {
            return { passed: false, message: "Function 'setupEventDelegation(container, selector, callback)' is not defined." };
        }
        const parent = win.document.createElement('div');
        const childBtn = win.document.createElement('button');
        childBtn.className = 'action-btn';
        childBtn.setAttribute('data-id', '99');
        parent.appendChild(childBtn);
        win.document.body.appendChild(parent);

        let clickedId = null;
        win.setupEventDelegation(parent, '.action-btn', (dataId) => {
            clickedId = dataId;
        });

        childBtn.click();
        win.document.body.removeChild(parent);

        if (clickedId !== '99') {
            return { passed: false, message: `Event delegation failed. Expected delegated callback with data-id '99', got '${clickedId}'.` };
        }
        return { passed: true, message: "Event bubbling & efficient event delegation pattern verified!" };
    },

    't2-storage': function(win) {
        const SafeStorage = getGlobalSymbol(win, 'SafeStorage');
        if (!SafeStorage || typeof SafeStorage.setItem !== 'function' || typeof SafeStorage.getItem !== 'function') {
            return { passed: false, message: "Object 'SafeStorage' with setItem(key, val, ttl) and getItem(key) is not defined." };
        }
        SafeStorage.setItem('test_token', 'secret123', 5000);
        const activeVal = SafeStorage.getItem('test_token');
        if (activeVal !== 'secret123') {
            return { passed: false, message: `Expected 'secret123' before expiration, got '${activeVal}'.` };
        }
        SafeStorage.setItem('exp_token', 'oldVal', -100);
        const expVal = SafeStorage.getItem('exp_token');
        if (expVal !== null) {
            return { passed: false, message: `Expected getItem to return null for expired TTL item, got '${expVal}'.` };
        }
        return { passed: true, message: "Client storage wrapper with TTL expiration handling verified!" };
    },

    't2-fetch': function(win) {
        if (typeof win.fetchWithRetry !== 'function') {
            return { passed: false, message: "Async function 'fetchWithRetry(fetchFn, maxRetries)' is not defined." };
        }
        let attempts = 0;
        const mockFetch = () => {
            attempts++;
            if (attempts < 3) return Promise.reject(new Error("Network Error"));
            return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: "success" }) });
        };

        return win.fetchWithRetry(mockFetch, 3).then(res => {
            if (attempts !== 3 || !res || res.status !== 200) {
                return { passed: false, message: `Expected 3 fetch attempts and 200 status, got ${attempts} attempts.` };
            }
            return { passed: true, message: "Fetch API retry mechanism & fault tolerance verified!" };
        }).catch(err => {
            return { passed: false, message: `fetchWithRetry failed: ${err.message}` };
        });
    },

    't2-performance': function(win) {
        if (typeof win.debounce !== 'function' || typeof win.throttle !== 'function') {
            return { passed: false, message: "Both 'debounce(fn, delay)' and 'throttle(fn, limit)' functions must be defined." };
        }
        let dCount = 0;
        const debounced = win.debounce(() => { dCount++; }, 50);
        debounced(); debounced(); debounced();
        if (dCount !== 0) {
            return { passed: false, message: "Debounced function should not execute immediately on rapid trigger calls." };
        }
        return { passed: true, message: "Debounce and Throttle performance optimization utilities verified!" };
    },

    't2-ui-animations': function(win) {
        const PhysicsParticle = getGlobalSymbol(win, 'PhysicsParticle');
        if (typeof PhysicsParticle !== 'function') {
            return { passed: false, message: "Class or constructor 'PhysicsParticle(x, y, vx, vy)' is not defined." };
        }
        const p = new PhysicsParticle(10, 10, 5, -10);
        if (typeof p.update !== 'function') {
            return { passed: false, message: "PhysicsParticle instance must have an 'update(gravity, bounce)' method." };
        }
        const res = p.update(0.5, -0.8);
        if (p.x !== 15 || p.vy !== -9.5) {
            return { passed: false, message: `Expected particle position/velocity to update (x=15, vy=-9.5), got x=${p.x}, vy=${p.vy}.` };
        }
        return { passed: true, message: "Mastered UI Animations, Vector Physics, and Motion Design!" };
    }
};

const SandboxEngine = {
    init: function() {
        this.runBtn = document.getElementById('run-code');
        this.textarea = document.getElementById('code-editor');
        this.terminal = document.getElementById('terminal-output');
        this.lessonId = document.body.getAttribute('data-lesson-id');
        this.expectedOutput = document.body.getAttribute('data-expected-output');

        if (this.runBtn && this.textarea) {
            this.runBtn.addEventListener('click', () => this.executeCode());
        }
    },

    printToTerminal: function(msg, type = 'info') {
        const line = document.createElement('div');
        line.className = `term-line term-${type}`;
        
        if (typeof msg === 'object') {
            try {
                line.textContent = '> ' + JSON.stringify(msg, null, 2);
            } catch (e) {
                line.textContent = '> ' + msg.toString();
            }
        } else {
            line.textContent = '> ' + msg;
        }
        
        this.terminal.appendChild(line);
        this.terminal.scrollTop = this.terminal.scrollHeight;
    },

    clearTerminal: function() {
        this.terminal.innerHTML = '';
    },

    validateExercise: function(iframeWindow, outputHistory) {
        const lessonId = this.lessonId;
        if (LessonTests[lessonId]) {
            this.printToTerminal("🧪 Running verification tests...", "info");
            Promise.resolve(LessonTests[lessonId](iframeWindow, outputHistory)).then(res => {
                if (res && res.passed) {
                    this.printToTerminal("✅ EXERCISE PASSED! " + (res.message || ""), 'success');
                    if (window.ProgressTracker && this.lessonId) {
                        window.ProgressTracker.markCompleted(this.lessonId);
                    }
                } else {
                    this.printToTerminal("❌ EXERCISE FAILED: " + (res ? res.message : "Tests did not pass."), 'error');
                }
            }).catch(err => {
                this.printToTerminal("❌ TEST ERROR: " + err.message, 'error');
            });
            return;
        }

        if (!this.expectedOutput) return;

        const passed = outputHistory.some(out => {
            const str = typeof out === 'object' ? JSON.stringify(out) : String(out);
            return str.includes(this.expectedOutput);
        });

        if (passed) {
            this.printToTerminal("✅ EXERCISE PASSED! Marking as complete...", 'success');
            if (window.ProgressTracker && this.lessonId) {
                window.ProgressTracker.markCompleted(this.lessonId);
            }
        } else {
            this.printToTerminal("❌ EXERCISE FAILED! Output did not match expectations.", 'error');
        }
    },

    executeCode: function() {
        this.clearTerminal();
        const rawCode = this.textarea.value;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const outputHistory = [];
        const iframeWindow = iframe.contentWindow;
        
        const originalLog = iframeWindow.console.log;
        iframeWindow.console.log = (...args) => {
            const msg = args.length === 1 ? args[0] : args;
            outputHistory.push(msg);
            this.printToTerminal(msg, 'info');
            originalLog.apply(iframeWindow.console, args);
        };
        
        const originalError = iframeWindow.console.error;
        iframeWindow.console.error = (...args) => {
            const msg = args.length === 1 ? args[0] : args;
            this.printToTerminal(msg, 'error');
            originalError.apply(iframeWindow.console, args);
        };

        // Storage Polyfill script to guarantee localStorage/sessionStorage works under file:// protocol or iframe security sandboxes
        const storagePolyfillCode = `
(function() {
    function createMock() {
        var store = {};
        return {
            getItem: function(k) { return store.hasOwnProperty(k) ? store[k] : null; },
            setItem: function(k, v) { store[k] = String(v); },
            removeItem: function(k) { delete store[k]; },
            clear: function() { store = {}; }
        };
    }
    try {
        var testKey = '__test_ls__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
    } catch(e) {
        var mockLS = createMock();
        window.localStorage = mockLS;
        window.sessionStorage = createMock();
    }
})();
`;

        // Transform top-level `const/let/class Foo` so evaluated symbols bind to global window object
        const transformedUserCode = rawCode
            .replace(/^\s*class\s+([a-zA-Z0-9_$]+)/gm, 'var $1 = class $1')
            .replace(/^\s*(const|let)\s+([a-zA-Z0-9_$]+)/gm, 'var $2');
        const finalExecutionCode = storagePolyfillCode + '\n' + transformedUserCode;

        try {
            iframeWindow.eval(finalExecutionCode);
            this.validateExercise(iframeWindow, outputHistory);
        } catch (err) {
            this.printToTerminal(err.toString(), 'error');
        } finally {
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 300);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SandboxEngine.init();
});
