/**
 * slot
 *
 * @author hyczzhu
 */
import pathToRegexp from 'path-to-regexp'
import modelExtend from 'dva-model-extend'
import queryString from 'query-string'
import { message } from 'antd/lib/index'
import { queryList, query, create, update, remove, changeStatus,transformApplicationSlotData, createSlot } from '../../services/slot'
import { query as queryApplication, transformApplicationsData } from '../../services/application'
import { pageModel } from '../common'
import eventEmitter from "../../utils/eventEmitter";
import { isWalletAvaliable, getAccount} from '../../services/dapi'
import {checkTXHash, checkUserInfo} from '../../services/wallet'

const transformData = item => item
const initialState = {
    application: null,
    currentItem: {},
    modalVisible: false,
    modalType: 'create',
    selectedRowKeys: [],
    filter: {},
}

export default modelExtend(pageModel, {

    namespace: 'applicationSlots',

    state: initialState,

    subscriptions: {
        setup ({ dispatch, history }) {
            history.listen((location) => {
                const match = pathToRegexp('/application/:id/slots').exec(location.pathname)
                if (match) {
                    const payload = {
                        page: 1,
                        pageSize: 10,
                        ...location.query,
                        ...queryString.parse(location.search),
                        app_id: match[1],
                    }
                    dispatch({ type: 'query', payload })
                } else {
                    dispatch({ type: 'reset' })
                }
            })
            eventEmitter.on('logout', () => {
                dispatch({
                    type: 'reset',
                })
            })
        },
    },

    effects: {
        * query ({ payload }, { call, put, select }) {
            const { application, filter = {} } = yield select(_ => _.applicationSlots)

            if (!application || (payload && payload.app_id && application.app_id !== payload.app_id)) {
                yield put({
                    type: 'queryApplication',
                    payload: {
                        app_id: payload.app_id,
                    },
                })
            }
            const _payload = {
                ...filter,
                ...payload,
            }

            yield put({
                type: 'setFilter',
                payload: _payload,
            })

            const data = yield call(queryList, _payload)
            if(data.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }
            data.data = data.result.items;
            data.recordsFiltered = data.result.total_count;
            if (data) {
                yield put({
                    type: 'querySuccess',
                    payload: {
                        list: (data.data || []).map(item => transformApplicationSlotData(item)),
                        pagination: {
                            current: Number(_payload.page) || 1,
                            pageSize: Number(_payload.pageSize) || 10,
                            total: data.recordsFiltered,
                        },
                    },
                })
                yield put({
                    type: 'updateState',
                    payload: data,
                })
            }
        },

        * queryApplication ({ payload = {} }, { call, put }) {
            try {
                payload.page_size = 10;
                payload.page_number =1;
                const data = yield call(queryApplication, payload)
                if (data) {
                    const pointer = data.result.items[0]
                    let application = transformApplicationsData(pointer)
                    yield put({
                        type: 'queryApplicationSuccess',
                        payload: {
                            application,
                        },
                    })
                }
            } catch (e) {
                message.error('Query application info fail, please try again later')
            }
        },

        * create ({ payload }, { call, put }) {
            console.log('application slot, create',payload)
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

            const input = {
                creator: accountInfo.result.value,
                id: data.result.id,
                name: data.result.name,
                type: data.result.slot_type,
                width: data.result.width,
                height: data.result.height,
                impression: data.result.impression,
                ctr: data.result.ctr,
            }

            console.log('create slot input', input)

            const createData = yield call(createSlot, input);
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
            const { pagination } = yield select(_ => _.applicationSlots)
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

        * prepareEdit ({ payload: slot_id }, { call, put }) {
            const data = yield call(query, { slot_id })
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
                        currentItem: translateSlotQueryData(data.result),
                    },
                })
            }
        },

        * changeStatus ({ payload }, { call, put, select }) {
            
            console.log('slot change status payload', payload)
            const available = yield call(checkUserInfo);
            if(available.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }

            const { pagination } = yield select(_ => _.applicationSlots);
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

            console.log('slot payload', payload)
            const change = yield call(changeStatus, {slotID:payload.slot_id, status:payload.status})
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

        * delete ({ payload }, { call, put, select }) {
            console.log('slot delete', payload)
            const data = yield call(remove, payload)
            if(data.code === 1001){
                message.error('Already logout, please login again.');
                yield put({type:'reset'})
                yield put({type:'app/redirectToLogin'})
                return
            }
            const { selectedRowKeys, pagination } = yield select(_ => _.applicationSlots)
            if (data.success) {
                yield put({
                    type: 'updateState',
                    payload: { selectedRowKeys: selectedRowKeys.filter(_ => _ !== payload) },
                })
                yield put({ type: 'query', payload: { page: pagination.current, pageSize: pagination.pageSize } })
            } else {
                throw data
            }
        },
    },

    reducers: {
        reset () {
            return { ...initialState }
        },

        setFilter (state, { payload }) {
            return { ...state, filter: payload }
        },

        queryApplicationSuccess (state, { payload }) {
            return { ...state, application: payload.application }
        },

        showModal (state, { payload }) {
            return { ...state, ...payload, modalVisible: true }
        },

        hideModal (state) {
            return { ...state, modalVisible: false }
        },
    },
})

function translateSlotQueryData(inputData){
    inputData.slot_name = inputData.name;
    inputData.slot_width = inputData.width;
    inputData.slot_height = inputData.height;
    inputData.slot_id = inputData.id;
    // inputData.status = getAppType(inputData.slot_status)
    inputData.slot_type = getAppType(inputData.slot_type)
    return inputData
}

function getAppType(inputString){
    let array = inputString.split('_')
    return array.pop().toLowerCase();
}
