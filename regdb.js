
const TB_HISTORY = 'demo_history', TB_USER = 'demo_user',
    COL_USER_ID = 'user_id', COL_STATUS = 'status', COL_INSERT_TIME = 'insert_time', COL_TIME_SUM = 'time_sum',
    COL_EMAIL = 'email', COL_PHONE = 'phone';
class RegDB {
    constructor(sqlConnector, sqlConfig, renewSecond) {
        this.sqlConnector = sqlConnector;
        this.sqlConfig = sqlConfig;

        this.con = null;
        this.renewSecond = parseFloat(renewSecond || (24 * 3600));


        process.on('SIGINT', () =>
            this.con ? this.con.end(err => {
                if (err)
                    logger.error(err);
                logger.info('SIGINT: exiting…');
                process.exit();

            }) : null
        );

        process.on('exit', () =>
            this.con ? this.con.end(err => {
                if (err)
                    logger.error(err);
                logger.info('exiting…');
                process.exit();

            }) : null);
    }

    static get STATUS_ACTIVATED() {
        return 1;
    }
    static get STATUS_UNLIMITED() {
        return 2;
    }
    static get STATUS_SUBSCRIPTION() {
        return 4;
    }

    getSQL() {
        if (!this.con) {
            this.con = this.sqlConnector(this.sqlConfig);
        }
        return this.con;
    }

    getData(email, phoneNumber) {
        let con = this.getSQL();
        return new Promise((res, rej) => {
            try {
                con.getConnection((err, conn) => {
                    if (err) rej(err);
                    return conn.query(`
                SELECT ${TB_USER}.${COL_USER_ID} AS ${COL_USER_ID}, ${TB_HISTORY}.${COL_TIME_SUM} AS time, ${TB_USER}.${COL_STATUS} AS ${COL_STATUS}
                FROM ${TB_USER}
                LEFT JOIN ${TB_HISTORY}
                ON
                ${TB_USER}.${COL_USER_ID} = ${TB_HISTORY}.${COL_USER_ID} AND
                ${TB_HISTORY}.${COL_INSERT_TIME} > DATE_SUB(NOW(), INTERVAL ${this.renewSecond} SECOND)
                
                WHERE ${TB_USER}.${COL_EMAIL}=? AND ${TB_USER}.${COL_PHONE}=?
                ORDER BY ${TB_HISTORY}.${COL_INSERT_TIME} DESC  LIMIT 1
                                `,
                        [email, phoneNumber],
                        (err, result) => {
                            // console.log("result = " + result);
                            conn.destroy();
                            return err ? rej(err) : res(result[0])

                        });
                });

            } catch (e) {
                rej(e);
            }

        });
    }
    register(name, organization, position, email, phone, status) {
        status = status || this.STATUS_ACTIVATED;
        let con = this.getSQL();
        return new Promise((res, rej) => {
            con.getConnection((err, conn) => {
                if (err) rej(err);
                return conn.query(
                    `INSERT INTO ${TB_USER} (name, organization, position, ${COL_EMAIL}, ${COL_PHONE}, ${COL_STATUS}) 
                VALUES (?, ?, ?, ?, ?, ?)`, [name, organization, position, email, phone, status],
                    (err, result) => {
                        // console.log("result = " + result);
                        conn.destroy();
                        return err ? rej(err) : res(result)
                    });
            });
        });
    }
    checkRemainTime(id) {
        let con = this.getSQL();
        return new Promise((res, rej) => {
            con.getConnection((err, conn) => {
                if (err) rej(err);
                return conn.query(
                    `SELECT ${COL_TIME_SUM}, ${COL_INSERT_TIME} FROM  ${TB_HISTORY} WHERE ${COL_USER_ID}=? AND ${COL_INSERT_TIME} > DATE_SUB(NOW(), INTERVAL ${this.renewSecond} SECOND) ORDER BY ${COL_INSERT_TIME} DESC LIMIT 1`, [id],
                    (err, result) => {
                        // console.log("result = " + result);

                        // return err ? rej(err) : res(result[0])
                        conn.destroy();
                        if (err) {
                            console.error(err);
                            rej(err);
                        } else {
                            res(result[0]);
                        }

                    });
            });
        });
    }
    updateTime(user_id, ip, time, time_sum) {
        let con = this.getSQL();
        return new Promise((res, rej) => {
            try {
                con.getConnection((err, conn) => {
                    if (err) rej(err);
                    return conn.query(
                        `INSERT INTO ${TB_HISTORY} (${COL_USER_ID},ip,time,${COL_TIME_SUM}) 
                    VALUES (?,?,?,?)`, [user_id, ip, time, time_sum],
                        (err, result) => {
                            // console.log("result = " + result);
                            conn.destroy();
                            return err ? rej(err) : res(result)

                        });
                });
            } catch (e) {
                rej(e);
            }

        });
    }
}

module.exports = RegDB;