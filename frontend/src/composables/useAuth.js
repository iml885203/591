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
exports.useAuth = void 0;
var vue_1 = require("vue");
var supabase_1 = require("../lib/supabase");
var user = (0, vue_1.ref)(null);
var session = (0, vue_1.ref)(null);
var loading = (0, vue_1.ref)(true);
var useAuth = function () {
    var isAuthenticated = (0, vue_1.computed)(function () { return !!user.value; });
    // 登入
    var signIn = function (email, password) { return __awaiter(void 0, void 0, void 0, function () {
        var emailRegex, _a, data, error, error_1, authError, friendlyMessage;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, 3, 4]);
                    loading.value = true;
                    // 基本輸入驗證
                    if (!(email === null || email === void 0 ? void 0 : email.trim()) || !(password === null || password === void 0 ? void 0 : password.trim())) {
                        throw new Error('Email 和密碼為必填欄位');
                    }
                    emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                    if (!emailRegex.test(email.trim())) {
                        throw new Error('Email 格式不正確');
                    }
                    return [4 /*yield*/, supabase_1.supabase.auth.signInWithPassword({
                            email: email.trim(),
                            password: password
                        })];
                case 1:
                    _a = _d.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        // 記錄錯誤以便監控
                        console.error('Authentication error:', {
                            message: error.message,
                            status: error.status,
                            timestamp: new Date().toISOString()
                        });
                        throw error;
                    }
                    return [2 /*return*/, { user: data.user, session: data.session, error: null }];
                case 2:
                    error_1 = _d.sent();
                    authError = error_1;
                    friendlyMessage = authError.message;
                    if ((_b = authError.message) === null || _b === void 0 ? void 0 : _b.includes('Invalid login credentials')) {
                        friendlyMessage = 'Invalid login credentials';
                    }
                    else if ((_c = authError.message) === null || _c === void 0 ? void 0 : _c.includes('Email not confirmed')) {
                        friendlyMessage = 'Email not confirmed';
                    }
                    return [2 /*return*/, {
                            user: null,
                            session: null,
                            error: __assign(__assign({}, authError), { message: friendlyMessage })
                        }];
                case 3:
                    loading.value = false;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // 登出
    var signOut = function () { return __awaiter(void 0, void 0, void 0, function () {
        var error, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    loading.value = true;
                    return [4 /*yield*/, supabase_1.supabase.auth.signOut()];
                case 1:
                    error = (_a.sent()).error;
                    if (error)
                        throw error;
                    user.value = null;
                    session.value = null;
                    return [2 /*return*/, { error: null }];
                case 2:
                    error_2 = _a.sent();
                    return [2 /*return*/, { error: error_2 }];
                case 3:
                    loading.value = false;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // 監聽認證狀態變化
    var initialize = function () {
        // 獲取當前 session
        supabase_1.supabase.auth.getSession().then(function (_a) {
            var currentSession = _a.data.session;
            session.value = currentSession;
            user.value = (currentSession === null || currentSession === void 0 ? void 0 : currentSession.user) || null;
            loading.value = false;
        });
        // 監聽認證狀態變化
        var subscription = supabase_1.supabase.auth.onAuthStateChange(function (event, currentSession) {
            session.value = currentSession;
            user.value = (currentSession === null || currentSession === void 0 ? void 0 : currentSession.user) || null;
            loading.value = false;
        }).data.subscription;
        return subscription;
    };
    return {
        // 狀態
        user: (0, vue_1.computed)(function () { return user.value; }),
        session: (0, vue_1.computed)(function () { return session.value; }),
        isAuthenticated: isAuthenticated,
        loading: (0, vue_1.computed)(function () { return loading.value; }),
        // 方法
        signIn: signIn,
        signOut: signOut,
        initialize: initialize
    };
};
exports.useAuth = useAuth;
