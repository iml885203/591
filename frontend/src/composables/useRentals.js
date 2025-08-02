"use strict";
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
exports.useRentals = void 0;
var vue_1 = require("vue");
var supabase_1 = require("../lib/supabase");
var useRentals = function (queryId) {
    var data = (0, vue_1.ref)([]);
    var isLoading = (0, vue_1.ref)(false);
    var error = (0, vue_1.ref)(null);
    var fetchRentals = function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, rentalsData, rentalsError, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!queryId.value)
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    isLoading.value = true;
                    error.value = null;
                    return [4 /*yield*/, supabase_1.supabase
                            .from('rentals')
                            .select("\n          *,\n          metro_distances(*),\n          query_rentals!inner(\n            queryId,\n            firstAppeared,\n            lastAppeared,\n            wasNotified\n          )\n        ")
                            .eq('query_rentals.queryId', queryId.value)
                            .eq('isActive', true)
                            .order('firstSeen', { ascending: false })];
                case 2:
                    _a = _b.sent(), rentalsData = _a.data, rentalsError = _a.error;
                    if (rentalsError)
                        throw rentalsError;
                    data.value = rentalsData || [];
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _b.sent();
                    error.value = err_1 instanceof Error ? err_1 : new Error(String(err_1));
                    return [3 /*break*/, 5];
                case 4:
                    isLoading.value = false;
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // Watch for queryId changes
    (0, vue_1.watchEffect)(function () {
        if (queryId.value) {
            fetchRentals();
        }
    });
    var execute = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchRentals()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    return {
        rentals: (0, vue_1.computed)(function () { return data.value; }),
        isLoading: (0, vue_1.computed)(function () { return isLoading.value; }),
        error: (0, vue_1.computed)(function () { return error.value; }),
        refetch: execute
    };
};
exports.useRentals = useRentals;
