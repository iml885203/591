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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var vue_1 = require("vue");
var vue_router_1 = require("vue-router");
var useAuth_1 = require("../composables/useAuth");
var router = (0, vue_router_1.useRouter)();
var _a = (0, useAuth_1.useAuth)(), signIn = _a.signIn, loading = _a.loading;
var email = (0, vue_1.ref)('');
var password = (0, vue_1.ref)('');
var error = (0, vue_1.ref)(null);
var validationErrors = (0, vue_1.ref)([]);
var emailError = (0, vue_1.ref)('');
// Email 驗證函數
var validateEmail = function () {
    var emailValue = email.value.trim();
    if (!emailValue) {
        emailError.value = 'Email 為必填欄位';
        return false;
    }
    // 更強化的 Email 格式驗證
    var emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(emailValue)) {
        emailError.value = '請輸入有效的 Email 格式';
        return false;
    }
    // 檢查常見錯誤
    if (emailValue.length > 254) {
        emailError.value = 'Email 地址過長';
        return false;
    }
    if (emailValue.includes('..')) {
        emailError.value = 'Email 格式不正確';
        return false;
    }
    emailError.value = '';
    return true;
};
// 清除 Email 錯誤訊息
var clearEmailError = function () {
    if (emailError.value) {
        emailError.value = '';
    }
};
// 整體輸入驗證函數
var validateInput = function () {
    var errors = [];
    // Email 驗證
    if (!validateEmail()) {
        errors.push(emailError.value);
    }
    // 密碼必填驗證（只檢查是否為空）
    if (!password.value.trim()) {
        errors.push('密碼為必填欄位');
    }
    validationErrors.value = errors;
    return errors.length === 0;
};
var handleSubmit = function () { return __awaiter(void 0, void 0, void 0, function () {
    var result, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                error.value = null;
                validationErrors.value = [];
                // 前端驗證
                if (!validateInput()) {
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, signIn(email.value, password.value)];
            case 2:
                result = _a.sent();
                if (result.error) {
                    error.value = result.error;
                }
                else {
                    router.push('/');
                }
                return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                error.value = err_1;
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
var getErrorMessage = function (error) {
    switch (error.message) {
        case 'Invalid login credentials':
            return '登入資訊錯誤，請檢查 Email 和密碼';
        case 'Unable to validate email address: invalid format':
            return 'Email 格式不正確';
        case 'Email not confirmed':
            return '請先確認您的 Email 地址';
        default:
            return error.message || '發生未知錯誤';
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
var __VLS_ctx = {};
var __VLS_elements;
var __VLS_components;
var __VLS_directives;
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" }));
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "max-w-md w-full space-y-8" }));
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({});
__VLS_asFunctionalElement(__VLS_elements.h2, __VLS_elements.h2)(__assign({ class: "mt-6 text-center text-3xl font-extrabold text-gray-900" }));
__VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)(__assign({ class: "mt-2 text-center text-sm text-gray-600" }));
__VLS_asFunctionalElement(__VLS_elements.form, __VLS_elements.form)(__assign({ onSubmit: (__VLS_ctx.handleSubmit) }, { class: "mt-8 space-y-6" }));
// @ts-ignore
[handleSubmit,];
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "rounded-md shadow-sm -space-y-px" }));
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({});
__VLS_asFunctionalElement(__VLS_elements.label, __VLS_elements.label)(__assign({ for: "email" }, { class: "sr-only" }));
__VLS_asFunctionalElement(__VLS_elements.input)(__assign(__assign(__assign(__assign({ onBlur: (__VLS_ctx.validateEmail) }, { onInput: (__VLS_ctx.clearEmailError) }), { id: "email", name: "email", type: "email", autocomplete: "email", required: true }), { class: ([
        'appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:z-10 sm:text-sm',
        __VLS_ctx.emailError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    ]) }), { placeholder: "Email 地址" }));
(__VLS_ctx.email);
// @ts-ignore
[validateEmail, clearEmailError, emailError, email,];
if (__VLS_ctx.emailError) {
    // @ts-ignore
    [emailError,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "mt-1 text-red-600 text-xs" }));
    (__VLS_ctx.emailError);
    // @ts-ignore
    [emailError,];
}
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({});
__VLS_asFunctionalElement(__VLS_elements.label, __VLS_elements.label)(__assign({ for: "password" }, { class: "sr-only" }));
__VLS_asFunctionalElement(__VLS_elements.input)(__assign(__assign({ id: "password", name: "password", type: "password", autocomplete: "current-password", required: true }, { class: "appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" }), { placeholder: "密碼" }));
(__VLS_ctx.password);
// @ts-ignore
[password,];
if (__VLS_ctx.validationErrors.length > 0) {
    // @ts-ignore
    [validationErrors,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3" }));
    __VLS_asFunctionalElement(__VLS_elements.ul, __VLS_elements.ul)(__assign({ class: "list-disc list-inside space-y-1" }));
    for (var _i = 0, _b = __VLS_getVForSourceType((__VLS_ctx.validationErrors)); _i < _b.length; _i++) {
        var validationError = _b[_i][0];
        // @ts-ignore
        [validationErrors,];
        __VLS_asFunctionalElement(__VLS_elements.li, __VLS_elements.li)({
            key: (validationError),
        });
        (validationError);
    }
}
if (__VLS_ctx.error) {
    // @ts-ignore
    [error,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3" }));
    (__VLS_ctx.getErrorMessage(__VLS_ctx.error));
    // @ts-ignore
    [error, getErrorMessage,];
}
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({});
__VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)(__assign({ type: "submit", disabled: (__VLS_ctx.loading) }, { class: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" }));
// @ts-ignore
[loading,];
if (__VLS_ctx.loading) {
    // @ts-ignore
    [loading,];
    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "absolute left-0 inset-y-0 flex items-center pl-3" }));
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }));
}
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gray-50']} */ ;
/** @type {__VLS_StyleScopedClasses['py-12']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:px-6']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:px-8']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-8']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-extrabold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-8']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['-space-y-px']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['appearance-none']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-none']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-b-md']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:z-10']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['list-disc']} */ ;
/** @type {__VLS_StyleScopedClasses['list-inside']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-red-50']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-red-200']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['group']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-blue-700']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:outline-none']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-offset-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled:cursor-not-allowed']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['left-0']} */ ;
/** @type {__VLS_StyleScopedClasses['inset-y-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['pl-3']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-white']} */ ;
var __VLS_dollars;
var __VLS_self = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
        return {
            loading: loading,
            email: email,
            password: password,
            error: error,
            validationErrors: validationErrors,
            emailError: emailError,
            validateEmail: validateEmail,
            clearEmailError: clearEmailError,
            handleSubmit: handleSubmit,
            getErrorMessage: getErrorMessage,
        };
    },
});
exports.default = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
    },
});
; /* PartiallyEnd: #4569/main.vue */
