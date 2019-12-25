/**
 * slot report
 *
 * @author hyczzhu
 */

import { request, config, getBeginTime, getEndTime, getTimeWithTZ} from 'utils'
import moment from 'moment'
import momentTZ from 'moment-timezone';

const { api } = config
const { slotReport } = api

export async function queryList (params) {
    return request({
        url: slotReport,
        method: 'get',
        data: translateData(params),
    })
}

// const formatPrice = (priceInCent) => {
//     priceInCent = parseInt(priceInCent, 10)
//     return parseFloat((priceInCent / 100).toFixed(2))
// }

export const transformData = (item) => {
    let { impressions, clicks } = item
    impressions = parseInt(impressions, 10)
    clicks = parseInt(clicks, 10)
    item.camp_id = item.campaign_id
    item.camp_name = item.campaign_name
    item.platform = item.platform_type
    item.slot_name = item.name
    item.revenue_received = (item.revenue_received/1000000000).toFixed(2) * 1;
    return {
        ...item,
        impressions: item.impression,
        clicks,
        ctr: (item.ctr * 100).toFixed(2), // eslint-disable-line
    }
}

export const translateData = (data) => {

    data.page_number = data.page;
    data.page_size = data.pageSize;

    if(data.start_date){
        data.begin = moment.utc(data.start_date).valueOf() - (data.timezone * 60 * 60 * 1000);
    }else{
        data.begin = 0
    }
    if(data.end_date){
        // data.end = getEndTime(moment.utc(getTimeWithTZ(data.end_date, data.timezone)).format("YYYY-MM-DD"));
        data.end = moment.utc(data.end_date).add(1, 'd').valueOf() - (data.timezone * 60 * 60 * 1000);
    }else{
        data.end = moment().valueOf()
    }
    if(data.platform){
        data.platform_type = data.platform
    }
    if(data.platform_type === 'all'){
        data.platform_type = undefined
    }
    console.log(data)
    return data
}

