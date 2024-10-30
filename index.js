const { select, input } = require('@inquirer/prompts');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const cron = require('cron');

const tasksFile = path.join(__dirname, 'tasks.json');

// Helper functions to read and write tasks
function getTasks() {
  if (fs.existsSync(tasksFile)) {
    return JSON.parse(fs.readFileSync(tasksFile));
  }
  return [];
}

function saveTasks(tasks) {
  fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
}

// Task manager functions
async function addTask() {
  const title = await input({ message: 'Task Title:' });
  const dueDate = await input({ message: 'Due Date (YYYY-MM-DD):' });

  const tasks = getTasks();
  tasks.push({ title, dueDate, done: false });
  saveTasks(tasks);
  console.log('Task added!');
}

async function listTasks() {
  const tasks = getTasks();
  console.log('\nYour Tasks:');
  tasks.forEach((task, index) => {
    console.log(
      `${index + 1}. [${task.done ? '✓' : ' '}] ${task.title} - Due: ${
        task.dueDate
      }`
    );
  });
}

async function markTaskDone() {
  const tasks = getTasks();
  const choices = tasks.map((task, index) => ({
    name: `${index + 1}. ${task.title}`,
    value: index,
  }));

  const taskIndex = await select({
    message: 'Select a package manager',
    choices,
  });

  tasks[taskIndex].done = true;
  saveTasks(tasks);
  console.log('Task marked as done!');
}

// Web scraping function to get productivity quote
async function getMotivationalQuote() {
  try {
    const { data } = await axios.get(
      'https://www.brainyquote.com/quote_of_the_day'
    );
    const $ = cheerio.load(data);
    const quote = $('.b-qt').first().text();
    console.log(`\nMotivational Quote: "${quote}"\n`);
  } catch (error) {
    console.error('Error fetching quote:', error);
  }
}

// Email reminder function
async function sendEmailReminder() {
  const tasks = getTasks().filter(task => !task.done);

  if (tasks.length === 0) {
    console.log('No pending tasks to remind.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your_email@gmail.com', // Replace with your email
      pass: 'your_password', // Replace with your email password
    },
  });

  const mailOptions = {
    from: 'your_email@gmail.com',
    to: 'recipient_email@gmail.com', // Replace with recipient's email
    subject: 'Daily Task Reminder',
    text:
      `You have ${tasks.length} pending tasks:\n\n` +
      tasks.map(task => `- ${task.title} (Due: ${task.dueDate})`).join('\n'),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email reminder sent!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Schedule daily email reminders at 8 AM
const dailyJob = new cron.CronJob('0 8 * * *', sendEmailReminder);
dailyJob.start();

// CLI Menu
async function showMenu() {
  console.log('\nTask Manager');
  await getMotivationalQuote();

  const action = await select({
    message: 'Choose an action:',
    choices: [
      { name: 'Add Task', value: 'add' },
      { name: 'List Tasks', value: 'list' },
      { name: 'Mark Task as Done', value: 'done' },
      { name: 'Send Email Reminder', value: 'email' },
      { name: 'Exit', value: 'exit' },
    ],
  });

  switch (action) {
    case 'add':
      await addTask();
      break;
    case 'list':
      await listTasks();
      break;
    case 'done':
      await markTaskDone();
      break;
    case 'email':
      await sendEmailReminder();
      break;
    case 'exit':
      console.log('Goodbye!');
      process.exit();
      break;
  }

  showMenu();
}

showMenu();
