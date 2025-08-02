"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var TheWelcome_vue_1 = require("../components/TheWelcome.vue");
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
var __VLS_ctx = {};
var __VLS_elements;
var __VLS_components;
var __VLS_directives;
__VLS_asFunctionalElement(__VLS_elements.main, __VLS_elements.main)({});
/** @type {[typeof TheWelcome, ]} */ ;
// @ts-ignore
var __VLS_0 = __VLS_asFunctionalComponent(TheWelcome_vue_1.default, new TheWelcome_vue_1.default({}));
var __VLS_1 = __VLS_0.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_0), false));
var __VLS_dollars;
var __VLS_self = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
        return {
            TheWelcome: TheWelcome_vue_1.default,
        };
    },
});
exports.default = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
    },
});
; /* PartiallyEnd: #4569/main.vue */
