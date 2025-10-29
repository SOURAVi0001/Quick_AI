import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import 'dotenv/config'
import {v2 as cloudinary} from 'cloudinary'
import axios from "axios";
import fs from "fs"
const pdf = await import('pdf-parse').then(module => module.default);

const AI = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});
export const generateArticle = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const  {userId}  = req.auth(); 
            const { prompt, length } = req.body;
            const plan = req.plan;

            console.log("HEYYY");

            const free_usage = req.free_usage;

            if (plan !== 'premium' && free_usage >= 5) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium Plan and continue." })
            }

            const response = await AI.chat.completions.create({
                  model: "gemini-2.0-flash",      
                  messages: [
                        {
                              role: "user",
                              content: prompt,
                        },
                  ],
                  temperature: 0.7,
                  max_tokens: length,
            });
            console.log("HEYYY");
            const content = response.choices[0].message.content;
            
            try {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, ${prompt}, ${content}, 'article')
  `;
  console.log("✅ Saved to database!");
} catch (error) {
  console.error("❌ Error saving to database:", error);
}
            
            if (plan !== 'premium' ) {
                  await clerkClient.users.updateUserMetadata(userId, {
                        privateMetadata: {
                              free_usage: free_usage + 1
                        }
                  })
            }
            res.json({ success: true, content })
      }
      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const generateBlogTitle = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const  {userId}  = req.auth(); 
            const { prompt } = req.body;
            const plan = req.plan;

            console.log("HEYYY");

            const free_usage = req.free_usage;

            if (plan !== 'premium' && free_usage >= 5) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium Plan and continue." })
            }

            const response = await AI.chat.completions.create({
                  model: "gemini-2.0-flash",      
                  messages: [
                        {
                              role: "user",
                              content: prompt,
                        },
                  ],
                  temperature: 0.7,
                  max_tokens: 100,
            });
            console.log("HEYYY");
            const content = response.choices[0].message.content;
            
            try {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, ${prompt}, ${content}, 'blog-title')
  `;
  console.log("✅ Saved to database!");
} catch (error) {
  console.error("❌ Error saving to database:", error);
}
            
            if (plan !== 'premium' ) {
                  await clerkClient.users.updateUserMetadata(userId, {
                        privateMetadata: {
                              free_usage: free_usage + 1
                        }
                  })
            }
            res.json({ success: true, content })
      }
      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const generateImage = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const  {userId}  = req.auth(); 
            const { prompt } = req.body;
            const plan = req.plan;

            console.log("HEYYY");


            if (plan !== 'premium' ) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." })
            }
                  
            const formData = new FormData()
formData.append('prompt', prompt)
            const {data} =await axios.post("https://clipdrop-api.co/text-to-image/v1",formData,{
                  headers:{
                        'x-api-key': process.env.CLIPDROP_API_KEY,
                  },
                  responseType:"arraybuffer",

            })
            const base64Image=`data:image/png;base64,${Buffer.from(data,'binary').toString('base64')}`;

            const {secure_url}=await cloudinary.uploader.upload(base64Image)
            try {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type, publish)
    VALUES (${userId}, ${prompt}, ${secure_url}, 'image',${publish ?? false})
  `;
  console.log("✅ Saved to database!");
} catch (error) {
  console.error("❌ Error saving to database:", error);
}
            
           
            res.json({ success: true, content:secure_url })
      }
      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const removeImageObject = async (req, res) => {
      try {
            const  {userId}  = req.auth(); 
            const  object  = req.body;
            const image =req.file;
            const plan = req.plan;
            if (plan !== 'premium' ) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." })
            }
                  
           const {public_id}=await cloudinary.uploader.upload(image.path) 
           const imageUrl= cloudinary.url(public_id,{
                  transformation:[{effect:`gem_remove:${object}`}],
                  resource_type:'image'
            })
            try {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, '${`Removed ${object} from image`}', ${imageUrl}, 'image')
  `;
  console.log("✅ Saved to database!");
} catch (error) {
  console.error("❌ Error saving to database:", error);
}
            
           
            res.json({ success: true, content:imageUrl })
      }
      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const removeImageBackground = async (req, res) => {
      try {
            console.log(req.auth());
            console.log(req.auth);

            const  {userId}  = req.auth(); 
            const  image  = req.file;
            const plan = req.plan;

            console.log("HEYYY");


            if (plan !== 'premium' ) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." })
            }
                  
            
            const {secure_url}=await cloudinary.uploader.upload(image.path,{
                  transformation:[{
                        effect:'background_removal',
                        background_removal:'remove_the_background'
                  }]
            })
            try {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, 'Remove background from image', ${imageUrl}, 'image')
  `;
  console.log("✅ Saved to database!");
} catch (error) {
  console.error("❌ Error saving to database:", error);
}
            
           
            res.json({ success: true, content:secure_url })
      }
      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
export const resumeReview = async (req, res) => {
      try {
            const  {userId}  = req.auth(); 
            const { resume } = req.file;
            const plan = req.plan;
            if (plan !== 'premium' ) {
                  return res.json({ success: false, message: "Limit reached. Upgrade to Premium subscriptions." })
            }
            if(resume.size>5*1024*1024){
                  return res.json({success:false,message:"Resume file size exceeds allowed size 5MB"})
            }
            const databuffer=fs.readFileSync(resume.path);
            const pdfData=await pdf(dataBuffer);
            const prompt=`review the following resume and provide constructive feedback on strengths weaknesses and area for improvement resume my content:\n\n${pdfData.text}`
            const response = await AI.chat.completions.create({
                  model: "gemini-2.0-flash",      
                  messages: [
                        {
                              role: "user",
                              content: prompt,
                        },
                  ],
                  temperature: 0.7,
                  max_tokens: 1000,
            });
            console.log("HEYYY");
            const content = response.choices[0].message.content;
            try {
  await sql`
    INSERT INTO creations (user_id, prompt, content, type)
    VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
  `;
  console.log("✅ Saved to database!");
} catch (error) {
  console.error("❌ Error saving to database:", error);
}
            
           
            res.json({ success: true, content })
      }
      catch (error) {
            console.log(error.message)
            res.json({ success: false, message: error.message })
      }
}
