const fs = require('fs');
const path = '/Users/1234/Desktop/PRINTACOTE SAAS /src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

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

// Replace colors
// bg-[#0D0D12] -> bg-background
dashboardContent = dashboardContent.replace(/bg-\[#0D0D12\]/g, 'bg-background');
dashboardContent = dashboardContent.replace(/text-white/g, 'text-dark');
// text-white/X -> text-dark/X
dashboardContent = dashboardContent.replace(/text-dark(\/\d+)/g, 'text-dark$1');
// bg-white/5 -> bg-white
dashboardContent = dashboardContent.replace(/bg-white\/5(?!0)/g, 'bg-white');
// bg-white/10 -> bg-white/50
dashboardContent = dashboardContent.replace(/bg-white\/10/g, 'bg-dark/5');
// border-white/10 -> border-dark/10
dashboardContent = dashboardContent.replace(/border-white\/10/g, 'border-dark/10');
dashboardContent = dashboardContent.replace(/border-white\/5/g, 'border-dark/5');
// #7B61FF -> primary
dashboardContent = dashboardContent.replace(/bg-\[#7B61FF\]/g, 'bg-primary');
dashboardContent = dashboardContent.replace(/text-\[#7B61FF\]/g, 'text-primary');
dashboardContent = dashboardContent.replace(/border-\[#7B61FF\]/g, 'border-primary');
dashboardContent = dashboardContent.replace(/shadow-\[#7B61FF\]/g, 'shadow-primary');

// bg-[#16161D] -> bg-white
dashboardContent = dashboardContent.replace(/bg-\[#16161D\]/g, 'bg-white');

// bg-[#1A1A24] -> bg-white
dashboardContent = dashboardContent.replace(/bg-\[#1A1A24\]/g, 'bg-white');

// text-white in buttons -> it might have changed to text-dark, let's fix buttons where we want text-white
// Wait, if we changed all text-white to text-dark, buttons with bg-primary should have text-white
dashboardContent = dashboardContent.replace(/bg-primary([^>]*)text-dark/g, 'bg-primary$1text-white');

content = content.slice(0, startIdx) + dashboardContent + content.slice(endIdx);

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
