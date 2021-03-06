const { Router } = require('express')
const bcrypt = require('bcryptjs')
const config = require('config')
const { check, validationResult } = require('express-validator')
const User = require('../models/User')
const router = Router()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { Types } = require('mongoose')
const Auth = require('../middleware/auth.middleware')
const isAdmin = require('../middleware/isAdmin.middleware')

router.post(
	'/register',
	[
		check('login', 'Некорректный login').isLength({
			min: 3,
		}),
		check('password', 'Минимальная длина пароля 6 символов').isLength({
			min: 6,
		}),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)

			if (!errors.isEmpty())
				return res.status(400).json({
					errors: errors.array(),
					message: 'Некорректные данные',
				})

			const { login, password } = req.body
			const user = await User.findOne({ login })

			if (!user || !user.needToChangePassword) {
				return res.status(404).json()
			}

			const isTheSamePassword = await bcrypt.compare(password, user.password)

			if (isTheSamePassword) {
				return res.status(400).json({
					message:
						'Введенный пароль совпадает с предыдущим. Сгенерируйте, пожалуйста, новый пароль',
				})
			}

			const hashedPassword = await bcrypt.hash(password, 12)
			user.password = hashedPassword
			user.needToChangePassword = false

			await user.save()
			res.status(201).json({ message: 'Пароль установлен!' })
		} catch (e) {
			res.status(500).json({
				message: 'Что-то пошло не так, попробуйте снова.',
			})
		}
	}
)

router.post(
	'/login',
	[
		check('login', 'Введите корректный login').exists(),
		check('password', 'Введите пароль').exists(),
	],
	async (req, res) => {
		try {
			const errors = validationResult(req)

			if (!errors.isEmpty())
				return res.status(400).json({
					errors: errors.array(),
					message: 'Некорректные данные при входе в систему',
				})

			const { login, password } = req.body
			const user = await User.findOne({ login })

			if (!user || !user.isAdmin)
				return res.status(400).json({
					message: 'Ошибка в логине или пароле. Попробуйте, пожалуйста, снова',
				})

			const isMatch = await bcrypt.compare(password, user.password)

			if (!isMatch)
				return res.status(400).json({
					message: 'Ошибка в логине или пароле. Попробуйте, пожалуйста, снова',
				})

			const token = jwt.sign({ userId: user.id }, config.get('jwtSecret'), {
				expiresIn: '10h',
			})

			const refreshToken = jwt.sign(
				{ userId: user.id },
				config.get('jwtSecret'),
				{
					expiresIn: '30d',
				}
			)

			user.refreshToken = refreshToken

			await user.save()

			res.status(200).json({
				token,
				//refreshToken: refreshToken,
				userId: user.id,
			})
		} catch (e) {
			res.status(500).json({
				message: 'Что-то пошло не так, попробуйте снова.',
			})
		}
	}
)

router.post('/reset-password', Auth, isAdmin, async (req, res) => {
	try {
		const { id } = req.body
		const user = await User.findById(id)

		if (!user) {
			res.status(404).json({
				message: 'Пользователь не найден',
			})
		}

		user.needToChangePassword = true

		await user.save()

		res.status(200).json({
			message: `У пользователя ${user.login} был успешно сброшен пароль!`,
		})
	} catch (e) {
		console.log(e)
		res.status(500).json({
			message: 'Что-то пошло не так, попробуйте снова.',
		})
	}
})

/*
router.post('/refresh-token', Auth, isAdmin, async (req, res) => {
	try {
		

	} catch (e) {}
})
*/
module.exports = router
