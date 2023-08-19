const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'shelfapp'
};

let pool = mysql.createPool(dbConfig);
async function connectDb() {
    try {
        const connection = await pool.getConnection();
        console.log('Veritabanına bağlanıldı!');
        connection.release();
    } catch (err) {
        console.error('Veritabanına bağlanırken hata oluştu!');
    }
}

connectDb();

function sql() {
    return {
        select: function (fields = []) {
            const selectedFields = fields.join(', ');
            return {
                from: function (table) {
                    const query = `SELECT ${selectedFields} FROM ${table}`;
                    let whereClause = '';
                    let queryParams = [];

                    return {
                        where: function (field, operator, value) {
                            if (Array.isArray(value)) {
                                for (let i = 0; i < value.length; i++) {
                                    if (whereClause.indexOf('WHERE') === -1) {
                                        whereClause += `WHERE ${field} ${operator} ? `;
                                    }

                                    if (i < value.length - 1) {
                                        whereClause += `AND ${field} ${operator} ? `;
                                    }
                                    queryParams.push(value[i]);
                                }
                            } else {
                                if (whereClause.indexOf('WHERE') === -1) {
                                    whereClause += `WHERE ${field} ${operator} ? `;
                                } else {
                                    whereClause += `AND ${field} ${operator} ? `;
                                }
                                queryParams.push(value);
                                return this;
                            }
                            return this;
                        },
                        orWhere: function (field, operator, value) {
                            if (Array.isArray(value)) {
                                for (let i = 0; i < value.length; i++) {
                                    if (whereClause.indexOf('WHERE') === -1) {
                                        whereClause += `WHERE ${field} ${operator} ? `;
                                    }
                                    if (i < value.length - 1) {
                                        whereClause += `OR ${field} ${operator} ? `;
                                    }
                                    queryParams.push(value[i]);
                                }
                            } else {
                                if (whereClause.indexOf('WHERE') === -1) {
                                    whereClause += `WHERE ${field} ${operator} ? `;
                                } else {
                                    whereClause += `OR ${field} ${operator} ? `;
                                }
                                queryParams.push(value);
                            }

                            return this;
                        },
                        execute: () => {
                            const fullQuery = `${query} ${whereClause} `;
                            const rquery = pool.format(fullQuery, queryParams);
                            return pool.execute(fullQuery, queryParams).then(([rows, fields]) => {
                                return { result: rows, error: null, query: rquery };
                            }).catch((err) => {
                                return { result: null, error: err, query: rquery };
                            })

                        }
                    }
                }
            }
        },
        insert: function (fields = []) {
            const selectedFields = fields.join(', ');
            let query = `INSERT INTO ?? (${selectedFields}) VALUES ?`;
            let table = null;
            let values = null;

            return {
                into: function (tbl) {
                    table = tbl;
                    return this;
                },
                values: function (vals) {
                    values = vals;
                    return this;
                },
                execute: function () {
                    const fullQuery = mysql.format(query, [table, [values]]);
                    return pool.execute(fullQuery)
                        .then(([result, fields]) => {
                            return { result: result.affectedRows > 0 ? 'success' : 'fail', error: null, query: fullQuery };
                        })
                        .catch((error) => {
                            return { result: 'error', error, query: fullQuery };
                        });
                }
            };
        },
        update: function (table) {
            return {
                set: function (fields, values, value_of_value) {
                    let data = '';
                    for (let i = 0; i < fields.length; i++) {
                        if (values[i] !== null) {
                            data += `${fields[i]} = '${values[i]}'`;
                            let hasNextValue = false;
                            for (let j = i + 1; j < fields.length; j++) {
                                if (values[j] != null) {
                                    hasNextValue = true;
                                    break;
                                }
                            }
                            if (hasNextValue) {
                                data += ', ';
                            }
                            if (data.indexOf('{}') !== -1) {
                                data = data.replace('{}', (value_of_value[i] ? value_of_value[i] : JSON.stringify(value_of_value[i])));
                            }
                        }
                    }
                    let query = `UPDATE ${table} SET ${data}`;
                    let whereClause = '';
                    let queryParams = [];

                    return {
                        where: function (field, operator, value) {
                            if (whereClause.indexOf('WHERE') === -1) {
                                whereClause += `WHERE ${field} ${operator} ? `;
                                queryParams.push(value);
                            } else {
                                whereClause += `AND ${field} ${operator} ? `;
                                queryParams.push(value);
                            }
                            return this;
                        },
                        orWhere: function (field, operator, value) {
                            if (whereClause.indexOf('WHERE') === -1) {
                                whereClause += `WHERE ${field} ${operator} ? `;
                                queryParams.push(value);
                            } else {
                                whereClause += `OR ${field} ${operator} ? `;
                                queryParams.push(value);
                            }

                            return this;
                        },
                        execute: function () {
                            let fullQuery = pool.format(`${query} ${whereClause} `, queryParams);
                            return pool.execute(json_replace(fullQuery)).then(([rows, fields]) => {
                                return { result: rows.affectedRows > 0 ? 'success' : 'fail', error: null, query: fullQuery };
                            }).catch((err) => {
                                return { result: 'error', error: err, query: fullQuery };
                            })
                        }
                    }
                }
            }
        },
        delete: function (table) {
            let query = `DELETE  FROM ${table}`;
            let whereClause = '';
            let queryParams = [];
            return {
                colunm: function (colunm = []) {
                    query = query.replace('?', colunm);
                    return this;
                },
                where: function (field, operator, value) {
                    whereClause += `WHERE ${field} ${operator} ? `;
                    queryParams.push(value);
                    return this;
                },
                orWhere: function (field, operator, value) {
                    if (whereClause.indexOf('WHERE') === -1) {
                        whereClause += `WHERE ${field} ${operator} ? `;
                        queryParams.push(value);
                    } else {
                        whereClause += `OR ${field} ${operator} ? `;
                        queryParams.push(value);
                    }

                    return this;
                },
                execute: function () {
                    const fullQuery = pool.format(`${query} ${whereClause} `, queryParams);
                    return pool.execute(fullQuery, queryParams).then(([rows, fields]) => {
                        return { result: rows.affectedRows > 0 ? 'success' : 'fail', error: null, query: fullQuery };
                    }).catch((err) => {
                        return { result: 'error', error: err, query: fullQuery };
                    })
                }
            }
        }
    }
}

function json_replace(str) {
    str = str.replace('"JSON_ARRAY_APPEND', 'JSON_ARRAY_APPEND');
    str = str.replace("'JSON_ARRAY_APPEND", 'JSON_ARRAY_APPEND');
    str = str.replace('"JSON_OBJECT', 'JSON_OBJECT');
    str = str.replace("'JSON_OBJECT", 'JSON_OBJECT');
    str = str.replace('"JSON_SET', 'JSON_SET');
    str = str.replace("'JSON_SET", 'JSON_SET');
    str = str.replace("'JSON_REMOVE", 'JSON_REMOVE');
    str = str.replace('"JSON_REMOVE', 'JSON_REMOVE');
    str = str.replace(')"', ')');
    str = str.replace(")'", ')');

    return str;
}
module.exports = { pool, sql };