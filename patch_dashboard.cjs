const fs = require('fs');
const path = '/Users/1234/Desktop/PRINTACOTE SAAS /src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Hide Navbar in Dashboard
content = content.replace(
    /<Navbar setPage=\{setPage\} currentPage=\{currentPage\} \/>/,
    "{currentPage !== 'dashboard' && <Navbar setPage={setPage} currentPage={currentPage} />}"
);

// Find the start and end of PrinterDashboard component
const startIdx = content.indexOf('const PrinterDashboard =');
const endIdx = content.indexOf('const Layout =');

let dashboardContent = content.slice(startIdx, endIdx);

// Remove "Contacts WhatsApp" card
dashboardContent = dashboardContent.replace(
    /(\s*<div className="dash-card[^>]*>\s*<div className="flex justify-between items-start">\s*<span className="[^"]*">Contacts WhatsApp<\/span>[\s\S]*?<\/div>\s*<\/div>)/g,
    ''
);

// Remove "Activité Récente" section
dashboardContent = dashboardContent.replace(
    /(\s*{\/\* Recent Activity \*\/}[\s\S]*?<\/section>)/g,
    ''
);

// Colors replacements
dashboardContent = dashboardContent.replace(/bg-\[#0D0D12\]/g, 'bg-background');
dashboardContent = dashboardContent.replace(/text-white/g, 'text-dark');
// Remove "/40", "/60" from text-white replacements if they turned into text-dark/40, etc.
// The easiest is just:
// text-white -> text-dark is already done.
// bg-white/5 -> bg-white
dashboardContent = dashboardContent.replace(/bg-white\/5(?!0)/g, 'bg-white');
// bg-white/10 -> bg-dark/5
dashboardContent = dashboardContent.replace(/bg-white\/10/g, 'bg-dark/5');
// border-white/10 -> border-dark/10
dashboardContent = dashboardContent.replace(/border-white\/10/g, 'border-dark/10');
dashboardContent = dashboardContent.replace(/border-white\/5/g, 'border-dark/5');
// #7B61FF -> primary
dashboardContent = dashboardContent.replace(/bg-\[#7B61FF\]/g, 'bg-primary');
dashboardContent = dashboardContent.replace(/text-\[#7B61FF\]/g, 'text-primary');
dashboardContent = dashboardContent.replace(/border-\[#7B61FF\]/g, 'border-primary');
dashboardContent = dashboardContent.replace(/shadow-\[#7B61FF\]/g, 'shadow-primary');

// Specific backgrounds for modal / mobile header
dashboardContent = dashboardContent.replace(/bg-\[#16161D\]/g, 'bg-white');
dashboardContent = dashboardContent.replace(/bg-\[#1A1A24\]/g, 'bg-white');

// Fix text-white on primary backgrounds
dashboardContent = dashboardContent.replace(/bg-primary([^>]*)text-dark/g, 'bg-primary$1text-white');

// The mobile active tab has text-primary instead of text-white
dashboardContent = dashboardContent.replace(/text-\[#7B61FF\]/g, 'text-primary');

content = content.slice(0, startIdx) + dashboardContent + content.slice(endIdx);

fs.writeFileSync(path, content, 'utf8');
console.log('Patch applied successfully!');
