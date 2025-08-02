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
var vue_1 = require("vue");
var useQueries_1 = require("../composables/useQueries");
var lucide_vue_next_1 = require("lucide-vue-next");
var _a = (0, useQueries_1.useQueries)(), queries = _a.queries, isLoading = _a.isLoading, error = _a.error, refetch = _a.refetch;
// Filter and search state
var searchQuery = (0, vue_1.ref)('');
var filterRegion = (0, vue_1.ref)('');
var sortBy = (0, vue_1.ref)('updatedAt');
// Available regions for filtering
var availableRegions = (0, vue_1.computed)(function () {
    var regions = queries.value
        .map(function (q) { return q.region; })
        .filter(function (region) { return region !== null; });
    return __spreadArray([], new Set(regions), true).sort();
});
// Filtered and sorted queries
var filteredAndSortedQueries = (0, vue_1.computed)(function () {
    var filtered = queries.value;
    // Apply search filter
    if (searchQuery.value.trim()) {
        var searchTerm_1 = searchQuery.value.toLowerCase();
        filtered = filtered.filter(function (query) {
            return query.description.toLowerCase().includes(searchTerm_1) ||
                (query.region && query.region.toLowerCase().includes(searchTerm_1));
        });
    }
    // Apply region filter
    if (filterRegion.value) {
        filtered = filtered.filter(function (query) { return query.region === filterRegion.value; });
    }
    // Apply sorting
    return __spreadArray([], filtered, true).sort(function (a, b) {
        switch (sortBy.value) {
            case 'rentalCount':
                return (b.rentalCount || 0) - (a.rentalCount || 0);
            case 'description':
                return a.description.localeCompare(b.description, 'zh-TW');
            default:
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
    });
});
var clearFilters = function () {
    searchQuery.value = '';
    filterRegion.value = '';
    sortBy.value = 'updatedAt';
};
var formatPrice = function (price) {
    if (!price)
        return '不限';
    return price.toLocaleString();
};
var formatDate = function (dateString) {
    return new Date(dateString).toLocaleDateString('zh-TW');
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
var __VLS_ctx = {};
var __VLS_elements;
var __VLS_components;
var __VLS_directives;
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "max-w-4xl mx-auto p-4" }));
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)(__assign({ class: "text-3xl font-bold mb-6 text-gray-900" }));
if (__VLS_ctx.isLoading) {
    // @ts-ignore
    [isLoading,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex justify-center items-center h-64" }));
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" }));
}
else if (__VLS_ctx.error) {
    // @ts-ignore
    [error,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-center py-12 text-red-600" }));
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)(__assign({ class: "mb-4" }));
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)(__assign({ class: "text-sm text-gray-500" }));
    (__VLS_ctx.error.message);
    // @ts-ignore
    [error,];
    __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)(__assign({ onClick: (__VLS_ctx.refetch) }, { class: "mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" }));
    // @ts-ignore
    [refetch,];
}
else if (__VLS_ctx.queries.length > 0) {
    // @ts-ignore
    [queries,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "mb-6" }));
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex flex-col md:flex-row gap-4" }));
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex-1" }));
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "relative" }));
    var __VLS_0 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    lucide_vue_next_1.Search;
    // @ts-ignore
    var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0(__assign({ class: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" })));
    var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([__assign({ class: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_1), false));
    __VLS_asFunctionalElement(__VLS_elements.input)(__assign({ value: (__VLS_ctx.searchQuery), type: "text", placeholder: "搜尋查詢描述或地區..." }, { class: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" }));
    // @ts-ignore
    [searchQuery,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex gap-2" }));
    __VLS_asFunctionalElement(__VLS_elements.select, __VLS_elements.select)(__assign({ value: (__VLS_ctx.filterRegion) }, { class: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" }));
    // @ts-ignore
    [filterRegion,];
    __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
        value: "",
    });
    for (var _i = 0, _b = __VLS_getVForSourceType((__VLS_ctx.availableRegions)); _i < _b.length; _i++) {
        var region = _b[_i][0];
        // @ts-ignore
        [availableRegions,];
        __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
            key: (region),
            value: (region),
        });
        (region);
    }
    __VLS_asFunctionalElement(__VLS_elements.select, __VLS_elements.select)(__assign({ value: (__VLS_ctx.sortBy) }, { class: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" }));
    // @ts-ignore
    [sortBy,];
    __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
        value: "updatedAt",
    });
    __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
        value: "rentalCount",
    });
    __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
        value: "description",
    });
}
if (!__VLS_ctx.isLoading && !__VLS_ctx.error) {
    // @ts-ignore
    [isLoading, error,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "grid gap-4" }));
    for (var _c = 0, _d = __VLS_getVForSourceType((__VLS_ctx.filteredAndSortedQueries)); _c < _d.length; _c++) {
        var query = _d[_c][0];
        // @ts-ignore
        [filteredAndSortedQueries,];
        var __VLS_5 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        RouterLink;
        // @ts-ignore
        var __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5(__assign({ key: (query.id), to: ("/query/".concat(query.id)) }, { class: "query-card" })));
        var __VLS_7 = __VLS_6.apply(void 0, __spreadArray([__assign({ key: (query.id), to: ("/query/".concat(query.id)) }, { class: "query-card" })], __VLS_functionalComponentArgsRest(__VLS_6), false));
        var __VLS_9 = __VLS_8.slots.default;
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex justify-between items-start" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex-1" }));
        __VLS_asFunctionalElement(__VLS_elements.h3, __VLS_elements.h3)(__assign({ class: "text-lg font-semibold text-gray-900 mb-2" }));
        (query.description);
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex flex-wrap gap-4 text-sm text-gray-600" }));
        if (query.region) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
            var __VLS_10 = {}.MapPin;
            /** @type {[typeof __VLS_components.MapPin, ]} */ ;
            // @ts-ignore
            lucide_vue_next_1.MapPin;
            // @ts-ignore
            var __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10(__assign({ class: "w-4 h-4" })));
            var __VLS_12 = __VLS_11.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_11), false));
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
            (query.region);
        }
        if (query.priceMin || query.priceMax) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
            var __VLS_15 = {}.DollarSign;
            /** @type {[typeof __VLS_components.DollarSign, ]} */ ;
            // @ts-ignore
            lucide_vue_next_1.DollarSign;
            // @ts-ignore
            var __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15(__assign({ class: "w-4 h-4" })));
            var __VLS_17 = __VLS_16.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_16), false));
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
            (__VLS_ctx.formatPrice(query.priceMin));
            (__VLS_ctx.formatPrice(query.priceMax));
            // @ts-ignore
            [formatPrice, formatPrice,];
        }
        if (query.stations) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
            var __VLS_20 = {}.Train;
            /** @type {[typeof __VLS_components.Train, ]} */ ;
            // @ts-ignore
            lucide_vue_next_1.Train;
            // @ts-ignore
            var __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20(__assign({ class: "w-4 h-4" })));
            var __VLS_22 = __VLS_21.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_21), false));
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
            (query.stations);
        }
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
        var __VLS_25 = {}.Clock;
        /** @type {[typeof __VLS_components.Clock, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Clock;
        // @ts-ignore
        var __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25(__assign({ class: "w-4 h-4" })));
        var __VLS_27 = __VLS_26.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_26), false));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
        (__VLS_ctx.formatDate(query.updatedAt));
        // @ts-ignore
        [formatDate,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-right" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1 text-2xl font-bold text-blue-600" }));
        var __VLS_30 = {}.Home;
        /** @type {[typeof __VLS_components.Home, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Home;
        // @ts-ignore
        var __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30(__assign({ class: "w-6 h-6" })));
        var __VLS_32 = __VLS_31.apply(void 0, __spreadArray([__assign({ class: "w-6 h-6" })], __VLS_functionalComponentArgsRest(__VLS_31), false));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
        (query.rentalCount || 0);
        __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)(__assign({ class: "text-sm text-gray-500" }));
        var __VLS_8;
    }
}
if (!__VLS_ctx.isLoading && !__VLS_ctx.error && __VLS_ctx.queries.length === 0) {
    // @ts-ignore
    [isLoading, error, queries,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-center py-12 text-gray-500" }));
    var __VLS_35 = {}.Home;
    /** @type {[typeof __VLS_components.Home, ]} */ ;
    // @ts-ignore
    lucide_vue_next_1.Home;
    // @ts-ignore
    var __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35(__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })));
    var __VLS_37 = __VLS_36.apply(void 0, __spreadArray([__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })], __VLS_functionalComponentArgsRest(__VLS_36), false));
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
}
if (!__VLS_ctx.isLoading && !__VLS_ctx.error && __VLS_ctx.queries.length > 0 && __VLS_ctx.filteredAndSortedQueries.length === 0) {
    // @ts-ignore
    [isLoading, error, queries, filteredAndSortedQueries,];
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-center py-12 text-gray-500" }));
    var __VLS_40 = {}.Search;
    /** @type {[typeof __VLS_components.Search, ]} */ ;
    // @ts-ignore
    lucide_vue_next_1.Search;
    // @ts-ignore
    var __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40(__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })));
    var __VLS_42 = __VLS_41.apply(void 0, __spreadArray([__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })], __VLS_functionalComponentArgsRest(__VLS_41), false));
    __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
    __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)(__assign({ onClick: (__VLS_ctx.clearFilters) }, { class: "mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" }));
    // @ts-ignore
    [clearFilters,];
}
/** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['h-64']} */ ;
/** @type {__VLS_StyleScopedClasses['animate-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['h-8']} */ ;
/** @type {__VLS_StyleScopedClasses['w-8']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-12']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['md:flex-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['relative']} */ ;
/** @type {__VLS_StyleScopedClasses['absolute']} */ ;
/** @type {__VLS_StyleScopedClasses['left-3']} */ ;
/** @type {__VLS_StyleScopedClasses['top-1/2']} */ ;
/** @type {__VLS_StyleScopedClasses['transform']} */ ;
/** @type {__VLS_StyleScopedClasses['-translate-y-1/2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['pl-10']} */ ;
/** @type {__VLS_StyleScopedClasses['pr-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:border-transparent']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['query-card']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-12']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-12']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-12']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-blue-600']} */ ;
var __VLS_dollars;
var __VLS_self = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
        return {
            Clock: lucide_vue_next_1.Clock,
            Home: lucide_vue_next_1.Home,
            MapPin: lucide_vue_next_1.MapPin,
            DollarSign: lucide_vue_next_1.DollarSign,
            Train: lucide_vue_next_1.Train,
            Search: lucide_vue_next_1.Search,
            queries: queries,
            isLoading: isLoading,
            error: error,
            refetch: refetch,
            searchQuery: searchQuery,
            filterRegion: filterRegion,
            sortBy: sortBy,
            availableRegions: availableRegions,
            filteredAndSortedQueries: filteredAndSortedQueries,
            clearFilters: clearFilters,
            formatPrice: formatPrice,
            formatDate: formatDate,
        };
    },
});
exports.default = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
    },
});
; /* PartiallyEnd: #4569/main.vue */
