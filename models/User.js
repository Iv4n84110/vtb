const { Schema, model, Types } = require('mongoose')

const shema = new Schema({
	login: { type: String, required: true, unique: true },
	password: { type: String },
	sault: { type: String, required: true, unique: true },
	cryptString: { type: String, required: true, unique: true },
	crypts: [{ date: Date }],
	isAdmin: { type: Boolean, required: true },
	needToChangePassword: { type: Boolean, required: true },
	isActive: { type: Boolean, required: true },
})

module.exports = model('User', shema)
