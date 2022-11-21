const Hotel = require('../models/hotel') //model of mongoose
const cloudinary = require('cloudinary');
const multer = require("multer");
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = multer.diskStorage({});

const upload = multer({ storage });

exports.upload = upload.single('image');

exports.pushToCloudinary = (req, res, next) => {
    if (req.file) {
        cloudinary.uploader.upload(req.file.path)
        .then((result)=>{
            req.body.image = result.public_id;
            next();
        })
        .catch(()=>{
            req.flash('error', 'Sorry there was a problem uploading your image, please try again...');
            res.redirect('/admin/add');
        })
    } else {
        next();
    }
}

// exports.homePage=(req,res)=>{
//     res.render('index', { title: 'Lets travel' });
// }

exports.listAllHotels = async (req,res, next)=>{
    try{
        const allHotels = await Hotel.find({available: {$eq: true}})
    res.render('all_hotels', { title: 'All hotels', allHotels});
    // res.json(allHotels)
    } catch(error){
        next(error);
    }
    
}

exports.listAllCountries = async (req,res,next) =>{
    try {
        const allCountries = await Hotel.distinct('country');
        res.render('all_countries', {title: 'Browse by country', allCountries})
    } catch (error) {
        next(error)
    }
}
exports.homePageFilters = async (req,res,next)=>{
    try {
        console.log(process.env.USER);
        const hotels =  Hotel.aggregate([
            {$match: {available: {$exists : true}} },
            {$sample: {size: 9} },
        ]);
        const countries =  Hotel.aggregate([
            { $group: {_id:'$country'} },
            { $sample: {size: 9} }
        ]);
        const [filteredCountries,filteredHotels]= await Promise.all([countries, hotels]);
        res.render('index',{ filteredCountries, filteredHotels })
    } catch (error) {
        next(error)
    }
}

//admin func
exports.adminPage = (req,res)=>{
    res.render('admin', {title: 'Admin' })
}
exports.createHotelGet = (req,res)=>{
    res.render('add_hotel', {title: 'Add new hotel' })
}
exports.createHotelPost = async (req,res, next)=>{
    try {
        const hotel = new Hotel(req.body)
    await hotel.save();
    //I have puted 'info' in below flash msg instead of success because success not working
    req.flash('info', `${hotel.hotel_name} created successfully!`);
    res.redirect(`/all/${hotel._id}`);
    } catch (error) {
        // res.send('some error accured')
        // console.log(error)
        next(error);
    }
    
}

exports.editRemoveGet = (req, res)=>{
    res.render('edit_remove', {title:'Search for hotel to edit or remove'})
}

//.collation is used to tell specific language result and strength set to 2 is to tell its not case sensitive
exports.editRemovePost = async (req, res, next)=>{
    try {
        const hotelId = req.body.hotel_id || null;
        const hotelName = req.body.hotel_name || null;
        const hotelData = await Hotel.find({ $or: [
            {_id: hotelId},
            {hotel_name: hotelName}
        ]}).collation({
            locale: 'en',
            strength: 2
        })

        if(hotelData.length > 0){
            res.render('hotel_detail', {title: 'Add / Remove Hotel', hotelData})
            return 
        } else {
            req.flash('info', 'No matches were found...');
            res.redirect('/admin/edit-remove')
        }

    } catch (error) {
        next(error)
    }
}

exports.updateHotelGet = async (req, res, next)=>{
    try {
        const hotel = await Hotel.findOne({ _id: req.params.hotelId });
        res.render('add_hotel', {title: 'Update hotel', hotel });
    } catch (error) {
        next(error)
    }
}

exports.updateHotelPost = async (req, res, next) => {
    try {
        const hotelId = req.params.hotelId;
        const hotel = await Hotel.findByIdAndUpdate(hotelId, req.body, {new:true})
        //I have puted 'info' in below flash msg instead of success because success not working
        req.flash('info', `${hotel.hotel_name} updated successfully!`);
        res.redirect(`/all/${hotelId}`)
    } catch (error) {
        next(error)
    }
}

exports.deleteHotelGet = async (req, res, next) => {
    try {
        const hotelId = req.params.hotelId;
    const hotel = await Hotel.findOne({_id:hotelId});
    res.render('add_hotel', {title:'Delete hotel', hotel});
    } catch (error) {
        next(error)
    }
    
}

exports.deleteHotelPost = async (req, res, next)=>{
    try {
        const hotelId = req.params.hotelId;
        const hotel = await Hotel.findByIdAndRemove({_id:hotelId});
        req.flash('info', `Hotel ID: ${hotelId} has been deleted`);
    } catch (error) {
        next(error)
    }
}

exports.hotelDetail = async (req, res, next) => {
    try {
       const hotelParam = req.params.hotel;
       const hotelData = await Hotel.find({_id:hotelParam});
       res.render('hotel_detail',{
        title:'Lets Travel', 
        hotelData
    })
    } catch (error) {
        next(error)
    }
}

exports.hotelsByCountry = async (req, res, next) => {
    try {
        const countryParam = req.params.country;
        const countryList = await Hotel.find({country: countryParam});
        res.render('hotels_by_country',{title:`Browse by country: ${countryParam}`, countryList});
    } catch (error) {
        next(error)
    }
}

exports.searchResults = async(req, res, next) => {
    try {
        const searchQuery =  req.body;
        const parsedStars = parseInt(searchQuery.stars) || 1
        const parsedSort = parseInt(searchQuery.sort) || 1
        const searchData = await Hotel.aggregate([
            {$match: {$text: {$search: `\"${searchQuery.destination}\"`}}},
            {$match: {available: true, star_rating: {$gte: parsedStars}}},
            {$sort: {cost_per_night: parsedSort}}
        ])
        // res.send(searchData)
        res.render('search_results', {title:'Search Results', searchQuery, searchData});
    } catch (error) {
        next(error)
    }
}
