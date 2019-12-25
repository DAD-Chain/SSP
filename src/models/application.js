/**
 * application
 *
 * @author hyczzhu
 */
import modelExtend from 'dva-model-extend'
import queryString from 'query-string'
import NProgress from 'nprogress'
import { queryList, query, create, update, changeStatus, deleteApplication, createApp } from 'services/application'
import {checkTXHash, checkUserInfo} from 'services/wallet'
import { queryAll as queryPubAll } from 'services/publisher'
import { getAppType } from 'utils'
import { pageModel } from 'models/common'
import { isWalletAvaliable, getAccount} from 'services/dapi'
import PLATFORM from '../constants/PLATFORM'
import { message } from 'antd/lib/index'
import moment from "moment";
import eventEmitter from "../utils/eventEmitter";

const transformData = item => ({
    ...item,
    country_obj: {
        country: item.country,
        all: !(item.country || []).length,
    },
})

const initialState = {
    currentItem: {},
    modalVisible: false,
    modalType: 'create',
    platform: PLATFORM.PC_WEB,
    selectedRowKeys: [],
    filter: {},
    pubList: [],
}

export default modelExtend(pageModel, {

    namespace: 'application',

    state: initialState,

    subscriptions: {
        setup ({ dispatch, history }) {
            history.listen((location) => {
                if (location.pathname === '/application') {

                    const currentDate = moment().format('YYYY-MM-DD')
                    const initial = {
                        page: 1, pageSize: 10, start_date: 0, end_date: currentDate, timezone: 8, // eslint-disable-line
                    }
                    const payload = location.query || initial;
                    // console.log(location, payload)
                    dispatch({
                        type: 'query',
                        payload,
                    })
                }
            })

            eventEmitter.on('logout', () => {
                dispatch({
                    type: 'reset',
                })
            })
        },
        // setup ({ dispatch, history }) {
        //     dispatch({ type: 'query',
        //         payload: {
        //             platform: PLATFORM.PC_WEB,
        //             page: 1,
        //             pageSize: 10,
        //         } })
        //     // history.listen((location) => {
        //     //     if (location.pathname === '/application') {
        //     //         dispatch({ type: 'query',
        //     //             payload: {
        //     //                 platform: PLATFORM.PC_WEB,
        //     //                 ...queryString.parse(location.search),
        //     //             } })
        //     //     }
        //     // })
        // },
    },

    effects: {
        * query ({ payload = {}}, { call, put, select }) {
            // const { isAdmin } = yield select(_ => _.app)
            const { filter = {}, platform, pubList } = yield select(_ => _.application)
            // console.log(filter, payload, platform)

            // if (isAdmin && !(pubList && pubList.length)) {
            //     yield put({
            //         type: 'queryPubs',
            //     })
            // }

            const _payload = {
                ...filter,
                platform,
                ...payload,
            }

            yield put({
                type: 'changeTab',
                payload: _payload.platform,
            })
            yield put({
                type: 'setFilter',
                payload: _payload,
            })

            const data = yield call(queryList, _payload);
            if(data.code === 1001 || !data){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }
            data.data = data.result.items;
            data.recordsFiltered = data.result.total_count;
            if (data.success) {
                yield put({
                    type: 'querySuccess',
                    payload: {
                        list: (data.data || []).map(item => transformApplicationsData(item)),
                        pagination: {
                            current: Number(_payload.page) || 1,
                            pageSize: Number(_payload.pageSize) || 10,
                            total: data.recordsFiltered,
                        },
                    },
                })
            } else {
                throw data
            }
        },

        * create ({ payload }, { call, put }) {
            const available = yield call(checkUserInfo);
            if(available.code === 1001 || !available){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }

            const data = yield call(create, payload)

            const walletInfo = yield call(isWalletAvaliable)
            if(!walletInfo){//钱包未安装或者禁用
                yield put({type:'app/openDownloadModel'});
                return false
            }
            const sessionData = JSON.parse(sessionStorage.getItem('loginState'));
            const accountInfo = yield call(getAccount)
            if(accountInfo.code === 3){//未登录钱包
                yield put({type:'app/openWarningModel', payload:{text:'Operation failed! This address is not logged into your Wallet. Please log in.'}});
                return false
            }
            if(accountInfo.code === 2){//钱包超时登出
                yield put({type:'app/openWarningModel', payload:{text:'Operation failed! Timed out, logged out of Wallet.'}});
                return false
            }
            if(accountInfo.code === 1){//未知错误
                yield put({type:'app/openWarningModel', payload:{text:'Operation failed! Unknown error.'}});
                return false
            }

            if(accountInfo.result.value != sessionData.result.wallet_address){//当前钱包账户与登录不一致
                yield put({type:'app/openWarningModel', payload:{text:'The current Wallet is not the same as the one you logged in with.'}});
                return false
            }
            const input = {}
            input.appType = payload.platform
            if(payload.platform_type === 'MOBILE_APP'){
                input.appTypeApp = {
                    creator:sessionData.result.wallet_address,
                    appID:data.result.id,
                    appName:payload.app_name,
                    appType:'PUBLISHER_APP_TYPE_FINANCE',
                    storeURL:payload.app_info.store_url,
                    packageName:payload.app_info.package_name,
                    contries:payload.country,
                    dau:payload.dau
                }
                if(payload.app_info.app_platform === 'android'){
                    input.appTypeApp.platform = 'PUBLISHER_APP_PLATFORM_ANDROID'
                }else{
                    input.appTypeApp.platform = 'PUBLISHER_APP_PLATFORM_IOS'
                }
            }else{
                input.webwapType = {
                    creator:sessionData.result.wallet_address,
                    appID:data.result.id,
                    webName:payload.app_name,
                    webType:'PUBLISHER_WEB_TYPE_'+payload.app_info.web_type.toUpperCase(),
                    contries:payload.country,
                    webURL:payload.app_info.web_url,
                    pv:payload.app_info.pv,
                    uv:payload.app_info.uv,
                }
            }

            const createData = yield call(createApp, input);
            if(createData && createData.code ===0 && createData.result && createData.result.code === 0){
                message.success('Successfully confirmed!');
                yield put({type: 'app/openLoading'})
                const res = yield call(checkTXHash, createData.result.result)
                if(res){
                    yield put({type: 'app/closeLoading'})
                    yield put({ type: 'hideModal' })
                    yield put({ type: 'query' })
                }else{
                    yield put({type:'app/openWarningModel', payload:{text:'Network error.'}});
                    yield put({type: 'app/closeLoading'})
                }

            }else{
                if(createData.code === 2){
                    message.error('Failed to confirm, please try again!');
                    yield put({type:'app/openWarningModel', payload:{text:'Please log in wallet.'}});
                    yield put({type: 'app/closeLoading'})
                }else{
                    if(createData.result && createData.result.code === -1){
                        yield put({type: 'app/closeLoading'})
                    }else{
                        message.error('Failed to confirm, please try again!');
                        yield put({type:'app/openWarningModel', payload:{text:'Unknown error.'}});
                        yield put({type: 'app/closeLoading'})
                    }
                }
            }
        },

        * update ({ payload }, { call, put, select }) {
            const { pagination } = yield select(_ => _.application)

            const data = yield call(update, payload)
            if(data.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }
            if (data.success) {
                yield put({ type: 'hideModal' })
                yield put({ type: 'query', payload: { page: pagination.current, pageSize: pagination.pageSize } })
            } else {
                throw data
            }
        },

        * prepareEdit ({ payload: app_id }, { call, put }) {
            const data = yield call(query, { app_id, page_size:10, page_number:1 })
            if(data.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }
            if (data) {
                yield put({
                    type: 'showModal',
                    payload: {
                        modalType: 'update',
                        currentItem: transformApplicationEditData(data.result.items[0]),
                    },
                })
            }
        },

        * changeStatus ({ payload }, { call, put, select }) {
            const available = yield call(checkUserInfo);
            if(available.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }

            const { pagination } = yield select(_ => _.application);
            const walletInfo = yield call(isWalletAvaliable)
            if(!walletInfo){//钱包未安装或者禁用
                yield put({type:'app/openDownloadModel'});
                return false
            }
            const sessionData = JSON.parse(sessionStorage.getItem('loginState'));
            const accountInfo = yield call(getAccount);
            if(accountInfo.code === 3){//未登录钱包
                yield put({type:'app/openWarningModel', payload:{text:'Operation failed! This address is not logged into your Wallet. Please log in.'}});
                return false
            }
            if(accountInfo.code === 2){//钱包超时登出
                yield put({type:'app/openWarningModel', payload:{text:'Operation failed! Timed out, logged out of Wallet.'}});
                return false
            }
            if(accountInfo.code === 1){//未知错误
                yield put({type:'app/openWarningModel', payload:{text:'Operation failed! Unknown error.'}});
                return false
            }

            if(accountInfo.result.value != sessionData.result.wallet_address){//当前钱包账户与登录不一致
                yield put({type:'app/openWarningModel', payload:{text:'The current Wallet is not the same as the one you logged in with.'}});
                return false
            }

            const change = yield call(changeStatus, {orderID:payload.app_id, status:payload.status})
            if(change && change.code === 0 &&change.result && change.result.code === 0){
                message.success('Successfully confirmed!');
                yield put({type: 'app/openLoading'})
                const res = yield call(checkTXHash, change.result.result);
                if(res){
                    yield put({type: 'app/closeLoading'})
                    yield put({ type: 'query', payload: { page: pagination.current, pageSize: pagination.pageSize } })
                }else{
                    yield put({type:'app/openWarningModel', payload:{text:'Network error.'}});
                    yield put({type: 'app/closeLoading'})
                }
            }else{
                if(change.code === 2){
                    message.error('Failed to confirm, please try again!');
                    yield put({type:'app/openWarningModel', payload:{text:'Please log in wallet.'}});
                    yield put({type: 'app/closeLoading'})
                }else{
                    if(change.result && change.result.code === -1){
                        yield put({type: 'app/closeLoading'})
                    }else{
                        message.error('Failed to confirm, please try again!');
                        yield put({type:'app/openWarningModel', payload:{text:'Unknown error.'}});
                        yield put({type: 'app/closeLoading'})
                    }
                }
            }
        },

        * deleteItem ({ payload }, { call, put, select }){
            const { pagination } = yield select(_ => _.application)
            const data = yield call(deleteApplication, payload);
            if(data.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }
            if (data.success) {
                yield put({ type: 'query', payload: { page: pagination.current, pageSize: pagination.pageSize } })
            } else {
                throw data
            }
        },

        //没用
        * queryPubs ({ payload = {} }, { call, put }) {
            try {
                const data = yield call(queryPubAll, payload)
                if (data) {
                    yield put({
                        type: 'queryPubsSuccess',
                        payload: {
                            list: data.data || [],
                        },
                    })
                }
            } catch (e) {
                message.error('Publishers query fails, please click search and try again')
            }
        },
    },

    reducers: {
        setFilter (state, { payload }) {
            return { ...state, filter: payload }
        },

        queryPubsSuccess (state, { payload }) {
            return { ...state, pubList: payload.list }
        },

        changeTab (state, { payload }) {
            return { ...state, platform: payload }
        },

        showModal (state, { payload }) {
            return { ...state, ...payload, modalVisible: true }
        },

        hideModal (state) {
            return { ...state, modalVisible: false }
        },

        reset (state) {
            return {
                ...state,
                ...initialState,
            }
        },

    },
})

function transformApplicationEditData(data){
    data.platform = data.platform_type;
    data.app_name = data.name;
    data.app_id = data.id;
    data.status = getAppType(data.app_status);
    data.address_url = data.address_receive_revenue;
    data.app_desc = data.desc;
    if(data.pc_web_apptype){
        data.web_type = getAppType(data.pc_web_apptype.web_type)
        data.pv = data.pc_web_apptype.pv
        data.uv = data.pc_web_apptype.uv
        data.web_url = data.pc_web_apptype.web_url;
    }
    if(data.mobile_web_apptype){
        data.pv = data.mobile_web_apptype.pv
        data.uv = data.mobile_web_apptype.uv
        data.web_type = getAppType(data.mobile_web_apptype.web_type)
        data.web_url = data.mobile_web_apptype.web_url;
    }

    if(data.mobile_appapptype){
        data.app_platform = getAppType(data.mobile_appapptype.app_platform)
        data.package_name = data.mobile_appapptype.package_name;
        data.store_url = data.mobile_appapptype.store_url;
        data.dau = data.mobile_appapptype.dau;
    }
    return data

}

function transformApplicationsData(item){
    item.app_id = item.id
    item.app_name = item.name
    switch(item.platform_type){
        case 'PC_WEB':
        item.urlOrPackageName = item.pc_web_apptype.web_url
        item.urlOrAppType = getAppType(item.pc_web_apptype.web_type)
        break;
        case 'MOBILE_WAP':
        item.urlOrPackageName = item.mobile_web_apptype.web_url
        item.urlOrAppType = getAppType(item.mobile_web_apptype.web_type)
        break;
        case 'MOBILE_APP':
        item.urlOrPackageName = item.mobile_appapptype.package_name
        item.urlOrAppType = item.mobile_appapptype.app_type ? getAppType(item.mobile_appapptype.app_type) : 'finance'
        break;
    }

    item.status = getAppType(item.app_status);
    if(item.status === 'actived'){
        item.status = 'active'
    }
    return {
        ...item,
    }
}
