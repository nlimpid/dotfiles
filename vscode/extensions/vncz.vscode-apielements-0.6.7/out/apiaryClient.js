"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
class ApiaryClient {
    constructor(token) {
        this.getDataObject = res => res.data;
        this.formatError = err => {
            if (err.response !== undefined) {
                if (err.response.data.parserError !== undefined) {
                    throw new Error(err.response.data.parserError);
                }
                else if (err.response.data.message !== undefined) {
                    throw new Error(err.response.data.message);
                }
            }
            throw err;
        };
        axios_1.default.defaults.headers.common.Authorization = `Bearer ${token}`;
        axios_1.default.defaults.headers.common.Authentication = `Token ${token}`;
        axios_1.default.defaults.baseURL = "https://api.apiary.io/";
    }
    getApiList() {
        return axios_1.default.get('me/apis')
            .then(this.getDataObject, this.formatError);
    }
    getApiCode(apiName) {
        return axios_1.default.get(`blueprint/get/${apiName}`)
            .then(this.getDataObject, this.formatError);
    }
    publishApi(apiName, code, commitMessage = "Saving API Description Document from VSCode") {
        return axios_1.default.post(`blueprint/publish/${apiName}`, {
            code,
            messageToSave: commitMessage,
            shouldCommit: true,
        }).then(undefined, this.formatError);
    }
}
exports.ApiaryClient = ApiaryClient;
//# sourceMappingURL=apiaryClient.js.map