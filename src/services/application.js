/**
 * application
 *
 * @author hyczzhu
 */
import { request, config, getBeginTime, getEndTime } from 'utils'
import {makeApp, makeAppStatusChange} from 'services/dapi'
import moment from 'moment/moment'
const { api } = config
const { applications, application, applicationCreate, applicationUpdate, applicationDelete } = api

export async function createApp(data){
    return await makeApp(data)
}

export async function changeStatus(data){
    return await makeAppStatusChange(data)
}

export async function queryList (params) {
    // await timeout(60000);
    return request({
        url: applications,
        method: 'get',
        data: translateData(params),
    })
}

export async function deleteApplication(data){
    return request({
        url: applicationDelete.replace('/:id', '/'+data.app_id),
        method: 'delete',
        data: '',
    })
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function query (params) {
    if(params.app_id){
        params.application_id = params.app_id
    }
    return request({
        url: application,
        method: 'get',
        data: params,
    })
}

export async function create (params) {
    // await timeout(60000);
    return request({
        url: applicationCreate,
        method: 'post',
        data: translateCreateData(params),
    })
}

export async function remove (params) {
    return request({
        url: application,
        method: 'delete',
        data: params,
    })
}

export async function update (params) {
    return request({
        url: applicationUpdate,
        method: 'post',
        data: translateCreateData(params),
    })
}

// export async function changeStatus (params) {
//     return request({
//         url: `${application}/status`,
//         method: 'put',
//         data: params,
//     })
// }

export const transformApplicationsData = (item) => {
    item.app_id = item.id
    item.app_name = item.name
    switch(item.platform_type){
        case 'PC_WEB':
        item.urlOrPackageName = item.pc_web_apptype.url
        item.urlOrAppType = getAppType(item.pc_web_apptype.web_type)
        break;
        case 'MOBILE_WAP':
        item.urlOrPackageName = item.mobile_web_apptype.url
        item.urlOrAppType = getAppType(item.mobile_web_apptype.web_type)
        break;
        case 'MOBILE_APP':
        item.urlOrPackageName = item.mobile_appapptype.url
        item.urlOrAppType = getAppType(item.mobile_appapptype.app_type)
        break;
    }

    item.status = getAppType(item.app_status);


    return {
        ...item,
    }
}

function getAppType(inputString){
    let array = inputString.split('_')
    return array.pop().toLowerCase();
}

const translateData = (data) => {
    data.page_number = data.page;
    data.page_size = data.pageSize;
    if(data.start_date){
        data.begin = moment(data.start_date).valueOf()
    }else{
        data.begin = 0
    }
    if(data.end_date){
        data.end = getEndTime(data.end_date)
    }else{
        data.end = moment().valueOf()
    }
    if(data.app_id){
        data.application_id = data.app_id
    }else{
        data.application_id = ''
    }
    if(data.app_name){
        data.application_name = data.app_name
    }else{
        data.application_name = ''
    }
    if(data.status === 'all'){
        data.status = ''
    }else{
        switch(data.status){
            case 'active':
            data.status = 'APP_STATUS_ACTIVED'
            break;
            case 'pending':
            data.status = 'APP_STATUS_PENDING'
            break;
            case 'paused':
            data.status = 'APP_STATUS_PAUSED'
            break;
        }
    }
    if(data.platform){
        data.platform_type = data.platform
    }
    return data
}

const translateCreateData = (data) => {
    if(data.app_id){
        data.id = data.app_id
    }

    if(data.app_desc){
        data.desc = data.app_desc
    }
    if(data.country.length ==0){
        data.country = ['ALL']
    }
    data.address_receive_revenue = data.address_url
    data.name= data.app_name
    switch(data.platform){
        case "PC_WEB":
        data.platform_type = "PC_WEB"
        data.pc_web_app_type = {
            pv:data.pv,
            uv:data.uv,
            url:'string',
            web_url:data.web_url,
            web_type:translateWebType(data.web_type)
        }
        break;
        case "MOBILE_WAP":
        data.platform_type = "MOBILE_WAP"
        data.mobile_web_app_type = {
            pv:data.pv,
            uv:data.uv,
            url:'string',
            web_url:data.web_url,
            web_type:translateWebType(data.web_type)
        }
        break;
        case "MOBILE_APP":
        data.platform_type = "MOBILE_APP"
        data.mobile_app_app_type = {
            dau:data.dau,
            package_name:data.package_name,
            url:'string',
            store_url:data.store_url,
            app_type: "PUBLISHER_APP_TYPE_FINANCE",
            web_type:translateWebType(data.web_type)
        }
        if(data.app_platform === 'ios'){
            data.mobile_app_app_type.app_platform = 'PUBLISHER_APP_PLATFORM_IOS'
        }else{
            data.mobile_app_app_type.app_platform = 'PUBLISHER_APP_PLATFORM_ANDROID'
        }
        break;
    }

    return data
}

const translateWebType = (data) => {
    switch(data){
        case "forum":
        return 'PUBLISHER_WEB_TYPE_FORUM'
        case "news":
        return 'PUBLISHER_WEB_TYPE_NEWS'
        case "exchange":
        return 'PUBLISHER_WEB_TYPE_EXCHANGE'
        case "personal":
        return 'PUBLISHER_WEB_TYPE_FORUM'
        case "finance":
        return 'PUBLISHER_APP_TYPE_FINANCE'
    }
}


