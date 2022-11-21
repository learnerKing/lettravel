const User = require('../models/user');
const Hotel = require('../models/hotel');
const Order = require('../models/order');
const Passport = require('passport');
//Express validator
// require('express-validator');
const {check , validationResult} = require('express-validator/check');
const {sanitize} = require('express-validator/filter');


//I got this message when I hover over querystring require method 
//The querystring API is considered Legacy. While it is still maintained, new code should use the URLSearchParams API instead. 
const querystring = require('querystring');

exports.signUpGet = (req, res) => {
    res.render('sign_up', {title: 'User sign up'})
}

exports.signUpPost = [
    //validate data
    check('first_name').isLength({ min: 1 }).withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name must be alphanumeric.'),

    check('surname').isLength({ min: 1 }).withMessage('Surname must be specified.')
    .isAlphanumeric().withMessage('Surname must be alphanumeric.'),

    check('email').isEmail().withMessage('Invalid email address'),

    check('confirm_email')
    .custom((value, { req }) => value === req.body.email)
    .withMessage('Email addresses do not match'),

    check('password').isLength({ min: 6 }).withMessage('Invalid password, passwords must be a minimum of 6 characters'),

    check('confirm_password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
    sanitize('*').trim().escape(),

    (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // res.json(req.body);
        res.render('sign_up', { title: 'Please fix the following errors:', errors: errors.array()});
        return;
      } else {
        //No errors
        const newUser = new User(req.body);
        User.register(newUser, req.body.password, function(err){
          if(err){
            console.log('error while registering!', err);
            return next(err);
          }
          next(); //Move onto loginPost after registering
        })
      }
    }
]

exports.loginGet = (req , res) => {
    res.render('login', {title: 'Login to continue'});
}

exports.loginPost = Passport.authenticate('local', {
  successRedirect: '/',
  successFlash: 'You are now logged in!',
  failureRedirect: '/login',
  failureFlash: 'Login failed, please try again'
});

exports.logout = (req, res, next) => {
  // req.logout();
  // res.redirect('/')
  //below is copied from stackflow 
  // otherwise this error was showing  Error: req#logout requires a callback function
  req.logout(function(err) {
    if (err) { return next(err); }
    req.flash('info','You are now logged out');
    res.redirect('/');
  });
}


exports.bookingConfirmation = async (req, res, next) => {
  try {
    const data = req.params.data;
    const searchData = querystring.parse(data);
    const hotel = await Hotel.find({_id:searchData.id})
    res.render('confirmation',{title:'Confirm you booking', hotel, searchData});
  } catch (error) {
    next(error);
  }
}

exports.orderPlaced = async(req, res, next) => {
  try {
    const data = req.params.data;
    const parsedData = querystring.parse(data);
    const order = new Order({
      user_id: req.user._id,
      hotel_id: parsedData.id,
      order_details: {
        duration: parsedData.duration,
        dateOfDeparture: parsedData.dateOfDeparture,
        numberOfGuests: parsedData.numberOfGuests
      }
    });
    await order.save();
    res.redirect('/my-account');
    // req.flash('info', 'Thank you your order has been placed!');
  } catch (error) {
      next(error);
  }
}

exports.myAccount = async (req, res, next) => {
  try{
    const orders = await Order.aggregate([
        {$match:{user_id: req.user.id }},
        {$lookup: {
          from: 'hotels',
          localField: 'hotel_id',
          foreignField: '_id',
          as: 'hotel_data'
        }}
    ])
    res.render('user_account', {title: "My Account", orders});
  }catch(error){
    next(error);
  }
}

exports.allOrders = async (req, res, next) => {
  try{
    const orders = await Order.aggregate([
        {$lookup: {
          from: 'hotels',
          localField: 'hotel_id',
          foreignField: '_id',
          as: 'hotel_data'
        }}
    ])
    res.render('orders', {title: "All Orders", orders});
  }catch(error){
    next(error);
  }
}

exports.isAdmin = (req, res, next) => {
  if(req.isAuthenticated() && req.user.isAdmin){
    next();
    return;
  }
  res.redirect('/');
}
