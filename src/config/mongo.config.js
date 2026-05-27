import mongoose from 'mongoose';

global.mongoose = { // eslint-disable-line no-undef
  conn: null,
  promise: null
};

export async function dbConnect(){
  if(global.mongoose && global.mongoose.conn){ // eslint-disable-line no-undef
    return global.mongoose.conn; // eslint-disable-line no-undef
  } else {
    const conString = process.env.DATABASE_URL; // eslint-disable-line no-undef

    const promise = mongoose.connect(conString, {
      autoIndex: true,
    });

    global.mongoose = { // eslint-disable-line no-undef
      conn: await promise,
      promise,
    };

    return await promise;
  }
}
