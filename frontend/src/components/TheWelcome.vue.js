"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var WelcomeItem_vue_1 = require("./WelcomeItem.vue");
var IconDocumentation_vue_1 = require("./icons/IconDocumentation.vue");
var IconTooling_vue_1 = require("./icons/IconTooling.vue");
var IconEcosystem_vue_1 = require("./icons/IconEcosystem.vue");
var IconCommunity_vue_1 = require("./icons/IconCommunity.vue");
var IconSupport_vue_1 = require("./icons/IconSupport.vue");
var openReadmeInEditor = function () { return fetch('/__open-in-editor?file=README.md'); };
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
var __VLS_ctx = {};
var __VLS_elements;
var __VLS_components;
var __VLS_directives;
/** @type {[typeof WelcomeItem, typeof WelcomeItem, ]} */ ;
// @ts-ignore
var __VLS_0 = __VLS_asFunctionalComponent(WelcomeItem_vue_1.default, new WelcomeItem_vue_1.default({}));
var __VLS_1 = __VLS_0.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_0), false));
var __VLS_3 = __VLS_2.slots.default;
{
    var __VLS_4 = __VLS_2.slots.icon;
    /** @type {[typeof DocumentationIcon, ]} */ ;
    // @ts-ignore
    var __VLS_5 = __VLS_asFunctionalComponent(IconDocumentation_vue_1.default, new IconDocumentation_vue_1.default({}));
    var __VLS_6 = __VLS_5.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_5), false));
}
{
    var __VLS_9 = __VLS_2.slots.heading;
}
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://vuejs.org/",
    target: "_blank",
    rel: "noopener",
});
var __VLS_2;
/** @type {[typeof WelcomeItem, typeof WelcomeItem, ]} */ ;
// @ts-ignore
var __VLS_10 = __VLS_asFunctionalComponent(WelcomeItem_vue_1.default, new WelcomeItem_vue_1.default({}));
var __VLS_11 = __VLS_10.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_10), false));
var __VLS_13 = __VLS_12.slots.default;
{
    var __VLS_14 = __VLS_12.slots.icon;
    /** @type {[typeof ToolingIcon, ]} */ ;
    // @ts-ignore
    var __VLS_15 = __VLS_asFunctionalComponent(IconTooling_vue_1.default, new IconTooling_vue_1.default({}));
    var __VLS_16 = __VLS_15.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_15), false));
}
{
    var __VLS_19 = __VLS_12.slots.heading;
}
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://vite.dev/guide/features.html",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://code.visualstudio.com/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://github.com/vuejs/language-tools",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://vitest.dev/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://www.cypress.io/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://playwright.dev/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.br)({});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)(__assign({ onClick: (__VLS_ctx.openReadmeInEditor) }, { href: "javascript:void(0)" }));
// @ts-ignore
[openReadmeInEditor,];
__VLS_asFunctionalElement(__VLS_elements.code, __VLS_elements.code)({});
var __VLS_12;
/** @type {[typeof WelcomeItem, typeof WelcomeItem, ]} */ ;
// @ts-ignore
var __VLS_20 = __VLS_asFunctionalComponent(WelcomeItem_vue_1.default, new WelcomeItem_vue_1.default({}));
var __VLS_21 = __VLS_20.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_20), false));
var __VLS_23 = __VLS_22.slots.default;
{
    var __VLS_24 = __VLS_22.slots.icon;
    /** @type {[typeof EcosystemIcon, ]} */ ;
    // @ts-ignore
    var __VLS_25 = __VLS_asFunctionalComponent(IconEcosystem_vue_1.default, new IconEcosystem_vue_1.default({}));
    var __VLS_26 = __VLS_25.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_25), false));
}
{
    var __VLS_29 = __VLS_22.slots.heading;
}
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://pinia.vuejs.org/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://router.vuejs.org/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://test-utils.vuejs.org/",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://github.com/vuejs/devtools",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://github.com/vuejs/awesome-vue",
    target: "_blank",
    rel: "noopener",
});
var __VLS_22;
/** @type {[typeof WelcomeItem, typeof WelcomeItem, ]} */ ;
// @ts-ignore
var __VLS_30 = __VLS_asFunctionalComponent(WelcomeItem_vue_1.default, new WelcomeItem_vue_1.default({}));
var __VLS_31 = __VLS_30.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_30), false));
var __VLS_33 = __VLS_32.slots.default;
{
    var __VLS_34 = __VLS_32.slots.icon;
    /** @type {[typeof CommunityIcon, ]} */ ;
    // @ts-ignore
    var __VLS_35 = __VLS_asFunctionalComponent(IconCommunity_vue_1.default, new IconCommunity_vue_1.default({}));
    var __VLS_36 = __VLS_35.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_35), false));
}
{
    var __VLS_39 = __VLS_32.slots.heading;
}
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://chat.vuejs.org",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://stackoverflow.com/questions/tagged/vue.js",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://bsky.app/profile/vuejs.org",
    target: "_blank",
    rel: "noopener",
});
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://x.com/vuejs",
    target: "_blank",
    rel: "noopener",
});
var __VLS_32;
/** @type {[typeof WelcomeItem, typeof WelcomeItem, ]} */ ;
// @ts-ignore
var __VLS_40 = __VLS_asFunctionalComponent(WelcomeItem_vue_1.default, new WelcomeItem_vue_1.default({}));
var __VLS_41 = __VLS_40.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_40), false));
var __VLS_43 = __VLS_42.slots.default;
{
    var __VLS_44 = __VLS_42.slots.icon;
    /** @type {[typeof SupportIcon, ]} */ ;
    // @ts-ignore
    var __VLS_45 = __VLS_asFunctionalComponent(IconSupport_vue_1.default, new IconSupport_vue_1.default({}));
    var __VLS_46 = __VLS_45.apply(void 0, __spreadArray([{}], __VLS_functionalComponentArgsRest(__VLS_45), false));
}
{
    var __VLS_49 = __VLS_42.slots.heading;
}
__VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)({
    href: "https://vuejs.org/sponsor/",
    target: "_blank",
    rel: "noopener",
});
var __VLS_42;
var __VLS_dollars;
var __VLS_self = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
        return {
            WelcomeItem: WelcomeItem_vue_1.default,
            DocumentationIcon: IconDocumentation_vue_1.default,
            ToolingIcon: IconTooling_vue_1.default,
            EcosystemIcon: IconEcosystem_vue_1.default,
            CommunityIcon: IconCommunity_vue_1.default,
            SupportIcon: IconSupport_vue_1.default,
            openReadmeInEditor: openReadmeInEditor,
        };
    },
});
exports.default = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
    },
});
; /* PartiallyEnd: #4569/main.vue */
