var express= require("express");
var app= express();
var bodyParser =require("body-parser");
var mongoose= require("mongoose");
var methodOverride=require("method-override");
var jsdom=require("jsdom");
var $ = require("jquery");
var JSDOM = jsdom.JSDOM;
var passport= require("passport");
var LocalStrategy= require("passport-local");
var passportLocalMongoose= require("passport-local-mongoose");
var flash= require("connect-flash");
var async = require("async");
var nodemailer=require("nodemailer");
var crypto = require("crypto");
var multer=require("multer");
var path=require("path");




//APP CONFIG===============================
mongoose.connect("mongodb+srv://kt_hub:Markspain1@cluster0-bc3j2.mongodb.net/test?retryWrites=true&w=majority",{useNewUrlParser: true});
var MongoUri="mongodb://localhost:27017/kt_hub";

//------home DB
 //-----cluster DB//  mongodb+srv://kt_hub:Markspain1@cluster0-bc3j2.mongodb.net/test?retryWrites=true&w=majority
 
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(flash());






//*******ALL SCHEMAS*************************************************
 
//USER schema =======================
var UserSchema= new mongoose.Schema({
    email:{type:String,unique:true, required:true},
    username:{type:String,unique:true, required:true},
    password:String,
    messageQueue:[{ 
        
        text:String
        
        
    }],
    resetPasswordToken: String,
    resetPasswordExpires: Date
    
});
 
 
 
UserSchema.plugin(passportLocalMongoose);
var User=mongoose.model("User",UserSchema);





//CommentSchema

var commentSchema= mongoose.Schema({
    text:String,
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username:String
        
    }
    
});

var comment= mongoose.model("Comment",commentSchema);
//PostSchema

//Post model config
var postSchema= new mongoose.Schema({
    body:String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String
        
    },
    comments:[
       {
          type:mongoose.Schema.Types.ObjectId,
          ref:"Comment"
       }
        ]
});

var post=mongoose.model("post", postSchema);
var postCount=post.collection.countDocuments();


//======EVENT SCHEMA======================

var eventSchema= new mongoose.Schema({
     title:String,
     description:String,
     date:String,
     imageUrl:String,
     author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username:String
        
    }
});

var event=mongoose.model("event", eventSchema);

var bookSchema= new mongoose.Schema({
     title:String,
     description:String,
     contact:String,
     price:Number,
     imageUrl:String,
      author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username:String
        
    }
});
bookSchema.index({'$**': 'text'});
var book=mongoose.model("book", bookSchema);

var articleSchema= new mongoose.Schema({
     title:String,
     body:String,
        author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username:String
        
    }
     
    
});

var article=mongoose.model("article",articleSchema);



//*****************************************************************

//PASSPORT CONFIGURATION=============

app.use(require("express-session")({
    secret:"This is my code",
    resave:false,
    saveUninitialized:false
    
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    
    res.locals.currentUser= req.user;
   res.locals.book=req.book;
   res.locals.error= req.flash("error");
   res.locals.success= req.flash("success");
    next();
})


//post creation

//CREATING A POST
/*
post.create({
    
    body:"hey mofos"
    
})
*/

// --HOME(INDEX ROUTEs)---

app.get("/",function(req, res) {
    res.redirect("/posts");
})

app.get("/posts",function(req,res){
     
      //find events first
      event.find({},function(err,events)
      {
          if(err)
          {
              console.log(err)
          }
          else
          {
                post.find({}).populate("comments").exec(function(err,posts){
                  if(err)
                  {
                         console.log(err);
                  }
        
                  else
                   {
                      res.render("newIndex",{posts:posts, currentUser:req.user,events:events});
             
                   }
        
                 });
              
          }
          
      })
  
   
});

//CREATE POST ROUTE

app.post("/posts",isLoggedIn,function(req,res){
     var postContent= req.body.post.body;
     var author={
         id:req.user._id,
         username:req.user.username
     }
    var NewPost={body:postContent,author:author}
    
    //CREATE POST
    post.create(NewPost,function(err,newlyCreatedPost)
    { 
       
        if(err)
        {
            console.log(err);
        }
        else
        {     
             
             res.redirect("/posts");
              
             
        }
       
    })
    
});

//EDIT POST ROUTE ====================

 app.get("/posts/:id/edit",isLoggedIn,checkOwnership,function(req, res) {
     
     post.findById(req.params.id,function(err, foundPost) {
         if(err)
         {
             console.log(err)
         }
         else
         {
             
              if(foundPost.author.id.equals(req.user._id))
              {
                  res.render("postEdit",{post:foundPost});
              }
              else
              {
                  res.send("UN AUTHORSED REQUEST");
              }
              
         }
     });
    
 })

//UPDATE POST ROUTE=====================
 
  app.put("/posts/:id",checkOwnership,function(req,res){
      //find and update post
      post.findByIdAndUpdate(req.params.id,req.body.post, function(err,updatedPost){
          if(err)
          {
              console.log(err);
          }
          else
          {
             
              res.redirect("/posts");
          }
          
      })
      
  });
  
  //DESTROY POST=====================
  
  app.delete("/posts/:id",checkOwnership,function(req,res){
      
     post.findByIdAndRemove(req.params.id,function(err){
         
         if(err)
         {
             console.log(err);
         }
         else
         {
             res.redirect("/posts");
         }
     })
      
      
      
  });
  

//=======================================================
 
 //SEARCH POST ROUTE==============================00====
    
    app.post("/search/post",function(req, res) {
        
        //  post.find({ $text: { $search: req.body.searchString } }).populate("comments").exec(function(err,posts)
              event.find({},function(err,events){
                  if(err)
                  {
                      console.log(err);
                  }
                  else{
                      
                      
                      
                post.find({$text: { $search: req.body.searchString }}).populate("comments").exec(function(err,posts){
                  if(err)
                  {
                         console.log(err);
                  }
        
                  else
                   {
                      res.render("newIndex",{posts:posts, currentUser:req.user,events:events});
             
                   }
        
                  });     
                  
                  
              }
               
            
              });     
        
    });
 
 
 
 //=====================================================
 
 
 
//COMMENT ROUTES

//RENDER COMMMENT TEMPLATE/FORM

app.get("/posts/:id/comments/new",isLoggedIn,function(req,res){
    
    //find post by ID
     post.findById(req.params.id, function(err,post){
          
        if(err)
        {
            console.log(err);
            
        }
        
        else
        
        {
            
            res.render("newComments",{post:post});
         }
        
        
    })
    
    
});

//CREATE COMMENT

app.post("/posts/:id/comments",isLoggedIn,function(req,res){
    //CREATE POST
    //lookup post using id
    post.findById(req.params.id, function(err,post){
        if(err)
        {
            console.log(err);
            
        }
        
        else
        
        {
                //create comment
                comment.create(req.body.comment,function(err,comment){
                    
                   if(err) 
                   {
                       console.log(err);
                   }
                   else
                   {
                       //add username and id to comment
                       
                       comment.author.id=req.user._id;
                      
                       comment.author.username= req.user.username
                        
                       //save comment.
                       comment.save();
                        
                      
                                             
                        
                        
                        
                        User.findById(post.author.id,function(err,foundUser){
                            
        
                             if(err)
                             {
                                 console.log(err);
                             }
                             
                             else
                             {
                                    
                                    var messageContent= {text:comment.author.username};  
                                                         
                                                         
                                    
                                    foundUser.messageQueue.push(messageContent);
                                    

                                    
                                    foundUser.save();
                                    
                                 
                             }
                            
                            
                        })
                        
                        
                       
                                    post.comments.push(comment);
                       
                    
                                    post.save();
                   
                                    res.redirect("/posts");
                     
                       
                    }
                    
                })
        
         }
        
        
    })
    
    
    
    // connect comment to post
    
    //show comment
    
    
});

//DESTROY COMMENTS ROUTE================================

   app.delete("/comments/:id",isLoggedIn,checkCommentOwnership,function(req,res){
      
     comment.findByIdAndRemove(req.params.id,function(err){
         
         if(err)
         {
             console.log(err);
         }
         else
         {
             res.redirect("/posts");
         }
     })
      
      
      
  });
  


//Notification routes =============================
 
 
  //show notifications
  
 app.get("/notifications/:id",function(req, res) {
     
     User.findById(req.params.id,function(err,foundUser){
         
         
         if(err)
         {
             console.log(err);
         }
         
         else
         {
             res.render("notifications",{foundUser:foundUser});
         }
         
         
     })
     
 })


//================================================




//=====================================================


//EVENT ROUTES=======================================
  
  //Render Evernt form
  
  app.get("/events",isLoggedIn,function(req, res) {
      
        res.render("eventform");
     
     
  })
  
  //Create Event
  
  app.post("/events",isLoggedIn,function(req, res) {
      
       var eventTitle=req.body.event.title;
       var eventDescription=req.body.event.description;
       var eventDate=req.body.event.date;
       var eventImageUrl=req.body.event.imageUrl;
       var author={
         id:req.user._id,
         username:req.user.username
          };
          
      var newEvent={title:eventTitle,description:eventDescription,date:eventDate,imageUrl:eventImageUrl,author:author};
      
      event.create(newEvent,function(err, newEvent) {
         
         if(err)
         {
             
             console.log(err);
             
         }
         
         else
         {
             res.redirect("/posts");
             
         }
         
     });
      
      
  });
 
 //EDIT EVENT==========================================
    app.get("/event/:id/edit",isLoggedIn,function(req, res) {
     
     event.findById(req.params.id,function(err, foundEvent) {
         if(err)
         {
             console.log(err)
         }
         else
         {
             
             
              
                  res.render("eventEdit",{event:foundEvent});
              
            
              
         }
     });
    
 })
    
 
 
 
 //UPDATE EVENT=======================================
   
  app.put("/event/:id",isLoggedIn,checkEventOwnership,function(req,res){
      
      event.findByIdAndUpdate(req.params.id,req.body.event,function(err,updatedEvent){
           
           if(err){
               console.log(err);
           }
           
           else
           {
               res.redirect("/posts");
           }
          
          
      })
      
      
  }) 
 
 
 //DELETE EVENT=======================================
  
  app.delete("/event/:id",isLoggedIn,checkEventOwnership,function(req,res){
      
     event.findByIdAndRemove(req.params.id,function(err){
         
         if(err)
         {
             console.log(err);
         }
         else
         {
             res.redirect("/posts");
         }
     })
      
      
      
  });
  
  
  
  
//========================================================



//BOOKS ROUTES===============================
 
 //Show page with all books
 
 app.get("/book",function(req, res) {
     
      book.find({},function(err,books)
      {
          if(err)
          {
              console.log(err);
          }
          else
          {
               res.render("booksShow",{books:books});
          }
      });
     
    
     
 });
 
 
 
 //Render book form
 app.get("/book/new",isLoggedIn,function(req, res) {
    
     res.render("bookForm");
     
 });
 
 //Add New Book=================================
   
   app.post("/book/new",isLoggedIn,function(req, res) {
         
         
        
        
         var bookTitle=req.body.book.title;
         var bookImage= req.body.book.imageUrl
         var bookDescription=req.body.book.description;
         var bookContact=req.body.book.contact;
         var bookPrice=req.body.book.price;
         var author={
         id:req.user._id,
         username:req.user.username
          }
         var Newbook={title:bookTitle,imageUrl:bookImage,description:bookDescription,contact:bookContact,price:bookPrice,author:author}    
       
       
       book.create(Newbook,function(err, newBook) {
           
           if(err)
           {
               console.log(err);
           }
           else
           {
               
               res.redirect("/book");
           }
       })
       
   })
 
 
// Books search route
   app.post("/book/search",function(req, res) {
       
        
       book.find( { $text: { $search: req.body.searchString } },function(err, foundBooks) {
           if(err)
           {
               console.log(err);
           }
           
           else
           {
                res.render("booksShow",{books:foundBooks});
           }
           
       } )
   })
 

//EDIT BOOK ROUTE  =========================

 app.get("/book/:id/edit",isLoggedIn,checkBookOwnership,function(req, res) {
      
      
          
         
         book.findById(req.params.id,function(err, foundBook) {
         if(err)
         {
             console.log(err)
         }
         else
         {
             
             
              
                  res.render("bookEdit",{book:foundBook});
              
            
              
         }
     });
    
     
 })
   
 //UPDATE BOOK ROUTE========================
   
   
   function checkIfImageAdded(req,res,next)
   {
        if(req.file)
        {
            next();
        }
        
        else
        {
            req.flash('error','Please add image');
            res.redirect('back');
        }
       
   }
   
   app.put("/books/:id",isLoggedIn,checkBookOwnership,function(req,res){
              
         
         var bookTitle=req.body.book.title;
         var bookImage= req.body.book.imageUrl;
         var bookDescription=req.body.book.description;
         var bookContact=req.body.book.contact;
         var bookPrice=req.body.book.price;
         var author={
         id:req.user._id,
         username:req.user.username
          }
         var Newbook={title:bookTitle,imageUrl:bookImage,description:bookDescription,contact:bookContact,price:bookPrice,author:author}    
       
      
      
      
      book.findByIdAndUpdate(req.params.id,Newbook,function(err,updatedBook){
          
           if(err){
               console.log(err);
           }
           
           else
           {
               res.redirect("/book");
           }
          
          
      })
      
      
  }) 
 
 //DESTROY BOOK ROUTE=================
 
   app.delete("/book/:id",isLoggedIn,checkBookOwnership,function(req,res){
      
     book.findByIdAndRemove(req.params.id,function(err){
         
         if(err)
         {
             console.log(err);
         }
         else
         {
             res.redirect("/book");
         }
     })
      
      
      
  });
  
 
 
 
 
// ===========================================
//===========================================
 
//===========================================


// ARTICLE ROUTES==================================
  
  //Show Articles
   app.get("/article",function(req, res) {
        
        
       article.find({},function(err, articles) {
           if(err)
           {
               console.log(err);
           }
           else
           {
               res.render("articleShow",{articles:articles});
           }
           
       });
        
   })
   
  //Create Article/Render article form
  
  //Rendeer article form
   
   app.get("/article/new",function(req, res) {
       res.render("articleForm");
   })
  
  //Create article
  
   app.post("/article",isLoggedIn,function(req, res) {
       
        var articleContent= req.body.article.body;
        var articleTitle=req.body.article.title;
        var author={
         id:req.user._id,
         username:req.user.username
     }
    var NewArticle={body:articleContent,title:articleTitle,author:author}
    
       article.create(NewArticle,function(err, newArticle) {
           
           if(err)
           {
               console.log(err);
           }
           else
           {
               res.redirect("/article");
           }
           
       });
       
       
   })
    

//EDIT ARTICLE ROUTE

 
 app.get("/article/:id/edit",isLoggedIn,checkArticleOwnership,function(req, res) {
      
         article.findById(req.params.id,function(err, foundArticle) {
         if(err)
         {
             console.log(err)
         }
         else
         {
             
             
              
                  res.render("articleEdit",{article:foundArticle});
              
            
              
         }
     });
    
     
 })

//UPDATE ARTICLE ROUTE=============================

   
   app.put("/article/:id",isLoggedIn,function(req,res){
      
      article.findByIdAndUpdate(req.params.id,req.body.article,function(err,updatedarticle){
          
           if(err){
               console.log(err);
           }
           
           else
           {
               res.redirect("/article");
           }
          
          
      })
      
      
  })
  
  //Destroy article Route============================
  
  
    
   app.delete("/article/:id",isLoggedIn,checkArticleOwnership,function(req,res){
      
     article.findByIdAndRemove(req.params.id,function(err){
         
         if(err)
         {
             console.log(err);
         }
         else
         {
             res.redirect("/article");
         }
     })
      
      
      
  });
  
 


//=================================================

//=================================================
//NOTIFICATION ROUTES===============================

  app.get("/notifications",function(req, res) {
      res.render("notifications");
       
  });
  
  
  //CLEAR NOTIFS ROUTE
  
  
  app.post("/notifications/:id",function(req, res) {
      
        User.findById(req.params.id,function(err, foundUser) {
            
             
             if(err)
            {
                
                console.log(err);
            }
            
            
             else{
                
                 var init=0;
                 while(foundUser.messageQueue.length > init)
                 {
                     foundUser.messageQueue.pop();
                 }
                    
                         
                   
                   foundUser.save();
                   
                   res.redirect("/posts");
                 
             }
           
            
            
        })
      
      
  })




//===============================================

//=====PROFILE routes====================
 //====SHOW USER POSTS========================
    
    app.get("/user/posts/:id",function(req, res) {
        
      
         
       post.find({"author.id":req.params.id}).populate("comments").exec(function(err, posts) {
           
           if(err){
               
               console.log(err)
           }
           else
           {
               res.render("myPosts",{posts:posts});
           }
           
       })
         
        
        
        
    })
    
    
//SHOW MY BOOKS ===========================    
     
    app.get("/user/books/:id",function(req, res) {
        
      
         
       book.find({"author.id":req.params.id},function(err, books){
           
           if(err){
               
               console.log(err)
           }
           else
           {
               res.render("myBooks",{books:books});
           }
           
       })
         
        
        
        
    })
    
    
 //===========================================   
 
 // SHOW MY EVENTS============================ 
     app.get("/user/events/:id",function(req, res) {
        
      
         
       event.find({"author.id":req.params.id},function(err, events){
           
           if(err){
               
               console.log(err)
           }
           else
           {
               res.render("myEvents",{events:events});
           }
           
       })
         
        
        
        
    })
    
    
//=======================================

//SHOW MY INFO=====================000

  app.get("/user/data/:id",function(req, res) {
        
      
         
       User.findById(req.params.id,function(err, user){
           
           if(err){
               
               console.log(err)
           }
           else
           {
               res.render("myProfile",{user:user});
           }
           
       })
         
        
        
        
    })



//===================================



//PASSWORD RESET ROUTES

//render Passoword reset form
app.get("/editpassword",function(req, res) {
    
    res.render("passwordResetFormEmail");
    
});

//Update user Password==========================

 app.post("/editpassword",function(req,res,next){
     
     async.waterfall([
         
         function(done){
             crypto.randomBytes(20, function(err,buf){
                 var token= buf.toString('hex');
                 done(err,token);
                 
                 
             });
         },
         
         function(token,done){
             User.findOne({email:req.body.email}, function(err,user){
                 if(!user){
                     req.flash('error','ingen användare med angivna mail existerar');
                     return res.redirect("/editpassword");
                 }
                 
                 user.resetPasswordToken=token;
                 user.resetPasswordExpires= Date.now() + 3600000; //1 hour
                 
                 user.save(function(err){
                     done(err,token,user);
                     
                 });
                 
                 
             });
             
             
         },
         
         function(token,user,done){
             var smtpTransport = nodemailer.createTransport({
                 service: 'Gmail',
                 auth:{
                     user:'fusekth@gmail.com',
                     pass: 'Markspain1'
                 }
                 
                 
             });
             
             var mailOptions={
                 to:user.email,
                 from:'fusekth@gmail.com',
                 subject:'passwordReset',
                 text:'you are reciving mail to reset password, click link to complete.You can also copy and paste link in browser ' +
                     'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                     'ignore message if you didnt request reset'
                 
             };
             smtpTransport.sendMail(mailOptions,function(err){
                 
                 
                 req.flash('success','Ett mail har skickats til   ' + ''+ user.email+ ''+ '  med återställnings info')
                 done(err,'done');
             });
             
             
         }
         
         
         
         
         
         ],function(err){
             
             if(err) return next(err);
             res.redirect('/editpassword');
         });
       
       
     
     
     
     
 });

 //get reset form with token
 
 app.get('/reset/:token', function(req, res) {
    User.findOne({resetPasswordToken:req.params.token, resetPasswordExpires:{$gt: Date.now()}},function(err,user){
        
        if(!user){
            
            req.flash('error','Password token is invalid or has expired');
        }
        
      
      res.render('passwordResetFormPassword',{token:req.params.token});   
        
    }) ;
     
     
     
     
 });
 
 // ADD NEW PASSWORD
 
 app.post('/reset/:token',function(req, res) {
     
     async.waterfall([
         function(done){
             
             User.findOne({resetPasswordToken:req.params.token, resetPasswordExpires:{$gt: Date.now()}},function(err, user) {
                 
                 if(!user){
                     req.flash('error', 'reset token is invalid or expired');
                     res.redirect('back');
                 }
                 
                 if(req.body.password===req.body.confirm){
                     
                     user.setPassword(req.body.password,function(err){
                         
                         user.resetPasswordToken= undefined;
                         user.resetPasswordExpires=undefined;
                         
                         user.save(function(err){
                             
                             req.logIn(user,function(err){
                                 
                                 done(err,user);
                             });
                             
                         });
                         
                         
                     })
                 }else{
                     
                     
                     req.flash("error","passwords do not match");
                     return res.redirect('back');
                 }
                 
                 
             });
         },
         
         function(user, done){
               var smtpTransport = nodemailer.createTransport({
                 service: 'Gmail',
                 auth:{
                     user:'fusekth@gmail.com',
                     pass: 'Markspain1'
                 }
                 
                 
             });
             
             var mailOptions={
                 to:user.email,
                 from:'fusekth@gmail.com',
                 subject:'passwordReset',
                 text:'password has been reset'
                 
             };
             smtpTransport.sendMail(mailOptions,function(err){
                 
                 
                 req.flash('success','din lösenord har återställts');
                 done(err,'done');
             });
            
             
         }
         
         
         ],function(err){
             
             res.redirect('/posts');
             
         });
     
     
 });


//====================================================
//AUTHENTICATION ROUTES===============================

//=========REGISTER ROUTES
//show register form

app.get("/register",function(req, res) {
    
    res.render("register");
    
});


//============================================
//SIGN UP LOGIC
app.post("/register",function(req, res) {
    var newUser=new User({email:req.body.email,username:req.body.username})
    User.register(newUser,req.body.password,function(err, user){
        if(err)
        {   
              req.flash("error",err.msg);
            console.log(err);
         return     res.redirect("register");
        }
        else
        {
           passport.authenticate("local")(req,res,function(){
               
               res.redirect("/posts");
           });
        }
    });
});




//LOGIN ROUTES =================

//SHOW login form ===============
 app.get("/login",function(req, res) {
     
     res.render("login");
 })

 //login logic
  app.post("/login",passport.authenticate("local",
  {   
      
      successRedirect:"/posts",
      
      failureRedirect:"/login"
      
  }),
  
  
  function(req, res) {
       
      
  })
 
 //LOGOUT ROUTES ==========================
  
  app.get("/logout",function(req, res) {
      req.logout();
      req.flash("success","Du loggades ut")
      res.redirect("/posts");
  })
 
 //**MIDDLEWARE****************************
 
 function isLoggedIn(req,res,next){
     
     if(req.isAuthenticated()){
         
         return next();
         
         
     }
      
     else
     {   
         req.flash("error","Du måste vara inloggad");
         res.redirect("/login");
     }
     
 };
 
 function checkOwnership(req,res,next)
 {
     
     post.findById(req.params.id,function(err, foundPost) {
         if(err)
         {
             console.log(err)
         }
         else
         {
             
              if(foundPost.author.id.equals(req.user._id))
              {
                 next();
              }
              else
              {
                  res.redirect("back");
              }
              
         }
     }) ;
     
 };
 
 function checkEventOwnership(req,res,next){
     
         event.findById(req.params.id,function(err, foundEvent) {
            
         if(err)
         {
             console.log(err)
         }
         else
         {
             
              if(foundEvent.author.id.equals(req.user._id))
              {
                 next();
              }
              else
              {
                  res.redirect("back");
              }
              
         }
     }) ;
         
     
     
 }
 
 function checkCommentOwnership(req,res,next)
 {
       
             comment.findById(req.params.id,function(err, foundComment) {
            
         if(err)
         {
             console.log(err)
         }
         else
         {
             
              if(foundComment.author.id.equals(req.user._id))
              {
                 next();
              }
              else
              {
                  res.redirect("back");
              }
              
         }
     }) ;
         
     
     
     
 }
 
 
 function checkBookOwnership(req,res,next)
 {
       
             book.findById(req.params.id,function(err, foundBook) {
               
            
         if(err)
         {
             console.log(err)
         }
         else
         {
             
              if(foundBook.author.id.equals(req.user._id))
              {
                 next();
              }
              else
              {
                  res.redirect("back");
              }
              
         }
     }) ;
         
     
     
     
 }
 
 function checkArticleOwnership(req,res,next)
 {
       
             article.findById(req.params.id,function(err, foundArticle) {
               
            
         if(err)
         {
             console.log(err)
         }
         else
         {
             
              if(foundArticle.author.id.equals(req.user._id))
              {
                 next();
              }
              else
              {
                  res.redirect("back");
              }
              
         }
     }) ;
         
     
     
     
 }
 
 
 
 
//LISTENING
app.listen(process.env.PORT,"0.0.0.0", function(){
    console.log("server on");
    
})



