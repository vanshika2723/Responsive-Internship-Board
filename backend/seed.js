
const db = require("./database");

const internships = [
    {
        id: "INT-101",
        title: "Frontend Intern",
        domain: "Full Stack Development",
        mode: "Remote",
        location: "India",
        stipend: "₹15,000/month",
        duration: "3 Months",
        skills: ["HTML", "CSS", "JavaScript", "React"],
        openings: 3,
        applications_open: 1
    },
    {
        id: "INT-102",
        title: "API Engineering Intern",
        domain: "Full Stack Development",
        mode: "Hybrid",
        location: "Pune",
        stipend: "₹18,000/month",
        duration: "4 Months",
        skills: ["Node.js", "Express.js", "SQL", "REST API"],
        openings: 2,
        applications_open: 1
    },
    {
        id: "INT-103",
        title: "UI/UX Intern",
        domain: "UI/UX",
        mode: "Remote",
        location: "India",
        stipend: "₹12,000/month",
        duration: "3 Months",
        skills: ["Figma", "User Research", "Wireframing"],
        openings: 1,
        applications_open: 1
    },
    {
        id: "INT-104",
        title: "Data Analyst Intern",
        domain: "Data Analytics",
        mode: "On-site",
        location: "Bengaluru",
        stipend: "₹20,000/month",
        duration: "6 Months",
        skills: ["Excel", "SQL", "Python", "Data Visualization"],
        openings: 2,
        applications_open: 1
    },
    {
        id: "INT-105",
        title: "Security Operations Intern",
        domain: "Cyber Security",
        mode: "Remote",
        location: "India",
        stipend: "₹16,000/month",
        duration: "4 Months",
        skills: ["Linux", "Networking", "Security Logs", "SIEM"],
        openings: 1,
        applications_open: 1
    }
];

const insertInternship = db.prepare(`
    INSERT INTO internships (
        id, title, domain, mode, location,
        stipend, duration, skills, openings, applications_open
    )
    VALUES (
        @id, @title, @domain, @mode, @location,
        @stipend, @duration, @skills, @openings, @applications_open
    )
    ON CONFLICT(id) DO NOTHING
`);

const seed = db.transaction(() => {
    for (const internship of internships) {
        insertInternship.run({
            ...internship,
            skills: JSON.stringify(internship.skills)
        });
    }
});

seed();

console.log("InternBoard seed data added successfully!");
console.log("Total seed records:", internships.length);

db.close();
