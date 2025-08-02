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
var vue_router_1 = require("vue-router");
var useRentals_1 = require("../composables/useRentals");
var useRealtimeRentals_1 = require("../composables/useRealtimeRentals");
var lucide_vue_next_1 = require("lucide-vue-next");
var route = (0, vue_router_1.useRoute)();
var queryId = (0, vue_1.computed)(function () { return route.params.queryId; });
// Filter and search state
var searchQuery = (0, vue_1.ref)('');
var priceMin = (0, vue_1.ref)();
var priceMax = (0, vue_1.ref)();
var filterHouseType = (0, vue_1.ref)('');
var sortBy = (0, vue_1.ref)('firstSeen');
var _a = (0, useRentals_1.useRentals)(queryId), rentals = _a.rentals, isLoading = _a.isLoading, error = _a.error, refetch = _a.refetch;
// Enable real-time updates
(0, useRealtimeRentals_1.useRealtimeRentals)(queryId, refetch);
// Available house types for filtering
var availableHouseTypes = (0, vue_1.computed)(function () {
    var types = rentals.value
        .map(function (r) { return r.houseType; })
        .filter(Boolean);
    return __spreadArray([], new Set(types), true).sort();
});
// Check if filters are active
var hasActiveFilters = (0, vue_1.computed)(function () {
    return searchQuery.value.trim() !== '' ||
        priceMin.value !== undefined ||
        priceMax.value !== undefined ||
        filterHouseType.value !== '';
});
// Filtered and sorted rentals
var filteredAndSortedRentals = (0, vue_1.computed)(function () {
    if (!rentals.value)
        return [];
    var filtered = rentals.value;
    // Apply search filter
    if (searchQuery.value.trim()) {
        var searchTerm_1 = searchQuery.value.toLowerCase();
        filtered = filtered.filter(function (rental) {
            return rental.title.toLowerCase().includes(searchTerm_1) ||
                (rental.metroTitle && rental.metroTitle.toLowerCase().includes(searchTerm_1)) ||
                rental.metro_distances.some(function (metro) {
                    return metro.stationName.toLowerCase().includes(searchTerm_1);
                });
        });
    }
    // Apply price range filter
    if (priceMin.value !== undefined) {
        filtered = filtered.filter(function (rental) {
            return rental.price !== null && rental.price >= priceMin.value;
        });
    }
    if (priceMax.value !== undefined) {
        filtered = filtered.filter(function (rental) {
            return rental.price !== null && rental.price <= priceMax.value;
        });
    }
    // Apply house type filter
    if (filterHouseType.value) {
        filtered = filtered.filter(function (rental) { return rental.houseType === filterHouseType.value; });
    }
    // Apply sorting
    return __spreadArray([], filtered, true).sort(function (a, b) {
        var _a, _b, _c, _d;
        switch (sortBy.value) {
            case 'price':
                return (a.price || 0) - (b.price || 0);
            case 'distance':
                // Sort by minimum metro distance
                var aDistance = Math.min.apply(Math, a.metro_distances.map(function (d) { return d.distance || Infinity; }));
                var bDistance = Math.min.apply(Math, b.metro_distances.map(function (d) { return d.distance || Infinity; }));
                return aDistance - bDistance;
            default:
                // Sort by first appeared date (newest first)
                var aDate = ((_b = (_a = a.query_rentals) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.firstAppeared) || a.firstSeen;
                var bDate = ((_d = (_c = b.query_rentals) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.firstAppeared) || b.firstSeen;
                return new Date(bDate).getTime() - new Date(aDate).getTime();
        }
    });
});
var clearFilters = function () {
    searchQuery.value = '';
    priceMin.value = undefined;
    priceMax.value = undefined;
    filterHouseType.value = '';
};
var formatDate = function (dateString) {
    return new Date(dateString).toLocaleDateString('zh-TW');
};
var formatDistance = function (distance) {
    if (distance > 1000) {
        return "".concat((distance / 1000).toFixed(1), "km");
    }
    return "".concat(distance, "m");
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
var __VLS_ctx = {};
var __VLS_elements;
var __VLS_components;
var __VLS_directives;
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "max-w-6xl mx-auto p-4" }));
__VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-4 mb-6" }));
var __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
RouterLink;
// @ts-ignore
var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0(__assign({ to: "/" }, { class: "flex items-center gap-2 text-blue-600 hover:text-blue-800" })));
var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([__assign({ to: "/" }, { class: "flex items-center gap-2 text-blue-600 hover:text-blue-800" })], __VLS_functionalComponentArgsRest(__VLS_1), false));
var __VLS_4 = __VLS_3.slots.default;
var __VLS_5 = {}.ArrowLeft;
/** @type {[typeof __VLS_components.ArrowLeft, ]} */ ;
// @ts-ignore
lucide_vue_next_1.ArrowLeft;
// @ts-ignore
var __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5(__assign({ class: "w-4 h-4" })));
var __VLS_7 = __VLS_6.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_6), false));
var __VLS_3;
__VLS_asFunctionalElement(__VLS_elements.h1, __VLS_elements.h1)(__assign({ class: "text-2xl font-bold text-gray-900" }));
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
else {
    if (__VLS_ctx.rentals.length > 0) {
        // @ts-ignore
        [rentals,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "mb-6" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex flex-col lg:flex-row gap-4" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex-1" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "relative" }));
        var __VLS_10 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Search;
        // @ts-ignore
        var __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10(__assign({ class: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" })));
        var __VLS_12 = __VLS_11.apply(void 0, __spreadArray([__assign({ class: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_11), false));
        __VLS_asFunctionalElement(__VLS_elements.input)(__assign({ value: (__VLS_ctx.searchQuery), type: "text", placeholder: "搜尋房源標題、地區或捷運站..." }, { class: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" }));
        // @ts-ignore
        [searchQuery,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex flex-wrap gap-2" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex gap-1" }));
        __VLS_asFunctionalElement(__VLS_elements.input)(__assign({ type: "number", placeholder: "最低價格" }, { class: "w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" }));
        (__VLS_ctx.priceMin);
        // @ts-ignore
        [priceMin,];
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "self-center text-gray-500" }));
        __VLS_asFunctionalElement(__VLS_elements.input)(__assign({ type: "number", placeholder: "最高價格" }, { class: "w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" }));
        (__VLS_ctx.priceMax);
        // @ts-ignore
        [priceMax,];
        __VLS_asFunctionalElement(__VLS_elements.select, __VLS_elements.select)(__assign({ value: (__VLS_ctx.filterHouseType) }, { class: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" }));
        // @ts-ignore
        [filterHouseType,];
        __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
            value: "",
        });
        for (var _i = 0, _b = __VLS_getVForSourceType((__VLS_ctx.availableHouseTypes)); _i < _b.length; _i++) {
            var houseType = _b[_i][0];
            // @ts-ignore
            [availableHouseTypes,];
            __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
                key: (houseType),
                value: (houseType),
            });
            (houseType);
        }
        __VLS_asFunctionalElement(__VLS_elements.select, __VLS_elements.select)(__assign({ value: (__VLS_ctx.sortBy) }, { class: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white" }));
        // @ts-ignore
        [sortBy,];
        __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
            value: "firstSeen",
        });
        __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
            value: "price",
        });
        __VLS_asFunctionalElement(__VLS_elements.option, __VLS_elements.option)({
            value: "distance",
        });
        if (__VLS_ctx.hasActiveFilters) {
            // @ts-ignore
            [hasActiveFilters,];
            __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)(__assign({ onClick: (__VLS_ctx.clearFilters) }, { class: "px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm" }));
            // @ts-ignore
            [clearFilters,];
        }
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "mt-3 text-sm text-gray-600" }));
        if (__VLS_ctx.filteredAndSortedRentals.length !== __VLS_ctx.rentals.length) {
            // @ts-ignore
            [rentals, filteredAndSortedRentals,];
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
            (__VLS_ctx.filteredAndSortedRentals.length);
            (__VLS_ctx.rentals.length);
            // @ts-ignore
            [rentals, filteredAndSortedRentals,];
        }
        else {
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
            (__VLS_ctx.rentals.length);
            // @ts-ignore
            [rentals,];
        }
    }
    __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "grid gap-6" }));
    for (var _c = 0, _d = __VLS_getVForSourceType((__VLS_ctx.filteredAndSortedRentals)); _c < _d.length; _c++) {
        var rental = _d[_c][0];
        // @ts-ignore
        [filteredAndSortedRentals,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ key: (rental.id) }, { class: "rental-card" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex justify-between items-start mb-4" }));
        __VLS_asFunctionalElement(__VLS_elements.h3, __VLS_elements.h3)(__assign({ class: "text-xl font-semibold text-gray-900 flex-1 mr-4" }));
        (rental.title);
        if (rental.price) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1 text-2xl font-bold text-green-600" }));
            var __VLS_15 = {}.DollarSign;
            /** @type {[typeof __VLS_components.DollarSign, ]} */ ;
            // @ts-ignore
            lucide_vue_next_1.DollarSign;
            // @ts-ignore
            var __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15(__assign({ class: "w-6 h-6" })));
            var __VLS_17 = __VLS_16.apply(void 0, __spreadArray([__assign({ class: "w-6 h-6" })], __VLS_functionalComponentArgsRest(__VLS_16), false));
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)({});
            (rental.price.toLocaleString());
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-sm text-gray-500" }));
        }
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 text-sm" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "space-y-2" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({});
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-600" }));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "font-medium text-gray-900" }));
        (rental.rooms || rental.houseType);
        if (rental.metroTitle) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
            var __VLS_20 = {}.Train;
            /** @type {[typeof __VLS_components.Train, ]} */ ;
            // @ts-ignore
            lucide_vue_next_1.Train;
            // @ts-ignore
            var __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20(__assign({ class: "w-4 h-4 text-blue-500" })));
            var __VLS_22 = __VLS_21.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4 text-blue-500" })], __VLS_functionalComponentArgsRest(__VLS_21), false));
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-600" }));
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "font-medium text-gray-900" }));
            (rental.metroTitle);
            if (rental.metroValue) {
                __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-blue-600" }));
                (rental.metroValue);
            }
        }
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "space-y-2" }));
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
        var __VLS_25 = {}.Calendar;
        /** @type {[typeof __VLS_components.Calendar, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Calendar;
        // @ts-ignore
        var __VLS_26 = __VLS_asFunctionalComponent(__VLS_25, new __VLS_25(__assign({ class: "w-4 h-4 text-gray-400" })));
        var __VLS_27 = __VLS_26.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4 text-gray-400" })], __VLS_functionalComponentArgsRest(__VLS_26), false));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-600" }));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-900" }));
        (__VLS_ctx.formatDate(rental.firstSeen));
        // @ts-ignore
        [formatDate,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex items-center gap-1" }));
        var __VLS_30 = {}.Calendar;
        /** @type {[typeof __VLS_components.Calendar, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Calendar;
        // @ts-ignore
        var __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30(__assign({ class: "w-4 h-4 text-gray-400" })));
        var __VLS_32 = __VLS_31.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4 text-gray-400" })], __VLS_functionalComponentArgsRest(__VLS_31), false));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-600" }));
        __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-900" }));
        (__VLS_ctx.formatDate(rental.lastSeen));
        // @ts-ignore
        [formatDate,];
        if (rental.metro_distances && rental.metro_distances.length > 0) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)({});
            __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-gray-600 text-xs" }));
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "space-y-1 mt-1" }));
            for (var _e = 0, _f = __VLS_getVForSourceType((rental.metro_distances.slice(0, 3))); _e < _f.length; _e++) {
                var metro = _f[_e][0];
                __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ key: (metro.id) }, { class: "text-xs" }));
                __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "font-medium text-gray-900" }));
                (metro.stationName);
                if (metro.distance) {
                    __VLS_asFunctionalElement(__VLS_elements.span, __VLS_elements.span)(__assign({ class: "text-blue-600 ml-1" }));
                    (__VLS_ctx.formatDistance(metro.distance));
                    // @ts-ignore
                    [formatDistance,];
                }
            }
        }
        if (rental.link) {
            __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "flex justify-end" }));
            __VLS_asFunctionalElement(__VLS_elements.a, __VLS_elements.a)(__assign({ href: (rental.link), target: "_blank", rel: "noopener noreferrer" }, { class: "flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium" }));
            var __VLS_35 = {}.ExternalLink;
            /** @type {[typeof __VLS_components.ExternalLink, ]} */ ;
            // @ts-ignore
            lucide_vue_next_1.ExternalLink;
            // @ts-ignore
            var __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35(__assign({ class: "w-4 h-4" })));
            var __VLS_37 = __VLS_36.apply(void 0, __spreadArray([__assign({ class: "w-4 h-4" })], __VLS_functionalComponentArgsRest(__VLS_36), false));
        }
    }
    if (__VLS_ctx.rentals.length === 0) {
        // @ts-ignore
        [rentals,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-center py-12 text-gray-500" }));
        var __VLS_40 = {}.Home;
        /** @type {[typeof __VLS_components.Home, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Home;
        // @ts-ignore
        var __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40(__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })));
        var __VLS_42 = __VLS_41.apply(void 0, __spreadArray([__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })], __VLS_functionalComponentArgsRest(__VLS_41), false));
        __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
    }
    if (__VLS_ctx.rentals.length > 0 && __VLS_ctx.filteredAndSortedRentals.length === 0) {
        // @ts-ignore
        [rentals, filteredAndSortedRentals,];
        __VLS_asFunctionalElement(__VLS_elements.div, __VLS_elements.div)(__assign({ class: "text-center py-12 text-gray-500" }));
        var __VLS_45 = {}.Search;
        /** @type {[typeof __VLS_components.Search, ]} */ ;
        // @ts-ignore
        lucide_vue_next_1.Search;
        // @ts-ignore
        var __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45(__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })));
        var __VLS_47 = __VLS_46.apply(void 0, __spreadArray([__assign({ class: "w-12 h-12 mx-auto mb-4 opacity-50" })], __VLS_functionalComponentArgsRest(__VLS_46), false));
        __VLS_asFunctionalElement(__VLS_elements.p, __VLS_elements.p)({});
        __VLS_asFunctionalElement(__VLS_elements.button, __VLS_elements.button)(__assign({ onClick: (__VLS_ctx.clearFilters) }, { class: "mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" }));
        // @ts-ignore
        [clearFilters,];
    }
}
/** @type {__VLS_StyleScopedClasses['max-w-6xl']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-6']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-blue-800']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
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
/** @type {__VLS_StyleScopedClasses['lg:flex-row']} */ ;
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
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-24']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['self-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['w-24']} */ ;
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-2']} */ ;
/** @type {__VLS_StyleScopedClasses['focus:ring-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-700']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-gray-300']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
/** @type {__VLS_StyleScopedClasses['rental-card']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['items-start']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mr-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-green-600']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-500']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
/** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
/** @type {__VLS_StyleScopedClasses['lg:grid-cols-3']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-400']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-gray-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['ml-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-blue-600']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-blue-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['w-4']} */ ;
/** @type {__VLS_StyleScopedClasses['h-4']} */ ;
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
            ArrowLeft: lucide_vue_next_1.ArrowLeft,
            ExternalLink: lucide_vue_next_1.ExternalLink,
            Train: lucide_vue_next_1.Train,
            Calendar: lucide_vue_next_1.Calendar,
            DollarSign: lucide_vue_next_1.DollarSign,
            Home: lucide_vue_next_1.Home,
            Search: lucide_vue_next_1.Search,
            searchQuery: searchQuery,
            priceMin: priceMin,
            priceMax: priceMax,
            filterHouseType: filterHouseType,
            sortBy: sortBy,
            rentals: rentals,
            isLoading: isLoading,
            error: error,
            refetch: refetch,
            availableHouseTypes: availableHouseTypes,
            hasActiveFilters: hasActiveFilters,
            filteredAndSortedRentals: filteredAndSortedRentals,
            clearFilters: clearFilters,
            formatDate: formatDate,
            formatDistance: formatDistance,
        };
    },
});
exports.default = (await Promise.resolve().then(function () { return require('vue'); })).defineComponent({
    setup: function () {
    },
});
; /* PartiallyEnd: #4569/main.vue */
