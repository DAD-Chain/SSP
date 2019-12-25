/**
 * slot
 *
 * @author hyczzhu
 */
import { request, config } from 'utils'
import { parseCommandLine } from 'typescript';
import { makeSlotStatusChange, makeSlot } from './dapi';

const { api } = config
const { slots, slot,slotCreate,changeSlotStatus,slotUpdate } = api

export async function createSlot(data){
    return await makeSlot(data)
}

export async function changeStatus(data){
    return await makeSlotStatusChange(data)
}

export async function queryAll (params) {
    return request({
        url: `${slots}/all`,
        method: 'get',
        data: params,
    })
}

export async function queryList (params) {
    return request({
        url: '/v1/api/application/slots',
        method: 'get',
        data: translateData(params),
    })
}

export async function query (params) {
    return request({
        url: slot,
        method: 'get',
        data: params,
    })
}

export async function create (params) {

    params.height = params.slot_height;
    params.width = params.slot_width;
    params.name = params.slot_name;
    switch(params.slot_type){
        case 'native':
        params.slot_type = 'SLOT_STATUS_NATIVE'
        break;
        case 'banner':
        params.slot_type = 'SLOT_TYPE_BANNER'
        break;
        case 'video':
        params.slot_type = 'SLOT_TYPE_VIDEO'
        break;
    }
    return request({
        url: slotCreate,
        method: 'post',
        data: params,
    })
}

export async function remove ({slot_id}) {
    
    return request({
        url: changeSlotStatus,
        method: 'post',
        data: {
            id: slot_id,
            status: "SLOT_STATUS_DELETED"
        },
    })
}

export async function update (params) {
    params.height = params.slot_height;
    params.width = params.slot_width;
    params.name = params.slot_name;
    params.id = params.slot_id
    switch(params.status){
        case 'active':
        params.status = 'SLOT_STATUS_ACTIVE'
        break;
        case 'paused':
        params.status = 'SLOT_STATUS_PAUSED'
        break;
        case 'pending':
        params.status = 'SLOT_STATUS_PENDING'
        break;
    }

    switch(params.slot_type){
        case 'native':
        params.slot_type = 'SLOT_STATUS_NATIVE'
        break;
        case 'banner':
        params.slot_type = 'SLOT_TYPE_BANNER'
        break;
        case 'video':
        params.slot_type = 'SLOT_TYPE_VIDEO'
        break;
    }
    return request({
        url: slotUpdate,
        method: 'post',
        data: params,
    })
}

export async function duplicate (params) {
    return request({
        url: `${slot}/duplicate`,
        method: 'post',
        data: params,
    })
}

// export async function changeStatus (params) {
//     params.id = params.slot_id;
//     switch(params.status){
//         case 'paused':
//         params.status = 'SLOT_STATUS_PAUSED'
//         break;
//         case 'active':
//         params.status = 'SLOT_STATUS_ACTIVE'
//         break;
//     }
//     return request({
//         url: changeSlotStatus,
//         method: 'post',
//         data: params,
//     })
// }

const translateData = (data) => {
    data.page_number = data.page;
    data.page_size = data.pageSize;
    return data
}

function getAppType(inputString){
    let array = inputString.split('_')
    return array.pop().toLowerCase();
}

export const transformApplicationSlotData = (item) =>{
    if(item.name){
        item.slot_name = item.name;
    }
    item.slot_type = getAppType(item.slot_type)
    if(item.slot_status){
        item.status = getAppType(item.slot_status)
    }
    item.slot_id = item.id
    return item
}

