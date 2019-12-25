import React from 'react'
import PropTypes from 'prop-types'
import { Table, Modal } from 'antd'
import { Link } from 'react-router-dom'
import { DropOption } from 'components'
import styles from './List.less'
import PLATFORM from '../../constants/PLATFORM'

const confirm = Modal.confirm

const List = ({ isAdmin, platform, onEditItem, onChangeStatus,onDeleteItem, ...tableProps }) => {
    const handleMenuClick = (record, e) => {
        switch (e.key) {
            case '1':
                onEditItem(record)
                break
            case '4': {
                confirm({
                    title: (
                        <div style={{ fontWeight: 'initial' }}>
                            {'Are you sure you want to active this application?'}
                            <br /><br />
                            {'Application Name: '}{record.app_name}<br />{'Description: '}{record.desc}
                        </div>
                    ),
                    onOk () {
                        onChangeStatus(record.app_id, 'active')
                    },
                })
                break
            }
            case '5': {
                confirm({
                    title: (
                        <div style={{ fontWeight: 'initial' }}>
                            {'Are you sure you want to pause this application?'}
                            <br /><br />
                            {'Application Name: '}{record.app_name}<br />{'Description: '}{record.desc}
                        </div>
                    ),
                    onOk () {
                        onChangeStatus(record.app_id, 'paused')
                    },
                })
                break
            }
            case '7': {
                confirm({
                    title: (
                        <div style={{ fontWeight: 'initial' }}>
                            {'Are you sure you want to delete this application?'}
                            <br /><br />
                            {'Application Name: '}{record.app_name}<br />{'Description: '}{record.desc}
                        </div>
                    ),
                    onOk () {
                        onDeleteItem(record.app_id)
                    },
                })
                break
            }
            default:
        }
    }

    const columns = [...(isAdmin ? [{
        title: 'Application ID',
        key: 'creator',
        dataIndex: 'create_user_name',
    }] : []),
    {
        title: 'Application ID',
        dataIndex: 'app_id',
        key: 'app_id',
    },
    {
        title: 'Application Name',
        key: 'app_name',
        render: (text, { app_id, app_name }) => <Link to={`/application/${app_id}/slots`}>{app_name}</Link>,
    },  {
        title: platform === PLATFORM.MOBILE_APP ? 'Package Name' : 'Url Name',
        key: 'urlOrPackageName',
        dataIndex: 'urlOrPackageName',
        // render: (text, record) => {
        //     const { web_url, package_name } = record
        //     return web_url || package_name
        // },
    }, {
        title: 'Type',
        key: 'urlOrAppType',
        dataIndex: 'urlOrAppType',
        // render: (text, record) => {
        //     const { web_type, app_type } = record
        //     return web_type || app_type
        // },
    }, {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
            switch (status) {
                case 'active':
                    return 'Active'
                case 'pending':
                    return 'Pending'
                case 'paused':
                    return 'Paused'
                default:
                    return ''
            }
        },
    }, {
        title: 'Operations',
        key: 'operation',
        width: 100,
        render: (text, record) => {
            const { status } = record
            let menuOptions = []
            if (status === 'paused') {
                menuOptions.push({
                    key: '4',
                    name: 'Activate',
                })
                menuOptions.push({
                    key: '7',
                    name: 'Delete',
                })
            } else if (status === 'active') {
                menuOptions.push({
                    key: '5',
                    name: 'Pause',
                })

            } else if (status === 'pending') {

            }
            menuOptions = [
                ...menuOptions,
                {
                    key: '6',
                    isDivider: true,
                }, {
                    key: '1',
                    name: 'Edit',
                },
            ]
            return (
                <DropOption
                    onMenuClick={e => handleMenuClick(record, e)}
                    menuOptions={menuOptions}
                    // menuOptions={[{ key: '1', name: 'Edit' }, { key: '3', name: 'Duplicate' }, { key: '2', name: 'Delete' }]}
                />
            )
        },
    }]

    return (
        <div>
            <Table
                {...tableProps}
                bordered
                // scroll={{ x: 1200 }}
                columns={columns}
                simple
                className={styles.table}
                rowKey={record => record.app_id}
            />
        </div>
    )
}

List.propTypes = {
    isAdmin: PropTypes.bool,
    platform: PropTypes.string,
    onEditItem: PropTypes.func,
    onChangeStatus: PropTypes.func,
}

export default List
