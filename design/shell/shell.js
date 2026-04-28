/* Shared shell helpers. Renders top nav, user-dashboard sidebar, hub-dashboard sidebar, admin rail. */

const MEREKA_LOGO_SVG = `<svg width="110" height="28" viewBox="0 0 145 36" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M61.266 15.3704C61.9719 14.1932 63.1156 13.6337 64.6563 13.6337C66.3382 13.6337 67.6566 14.3891 68.329 15.6228C68.7375 15.0004 69.295 14.4899 69.9509 14.1376C70.6067 13.7853 71.3402 13.6024 72.0847 13.6055C75.1397 13.6055 77.1305 15.6228 77.1305 19.4914V25.8273C77.1305 26.7521 76.6822 27.1721 75.7291 27.1721C74.8326 27.1721 74.3843 26.7521 74.3843 25.8273V19.2108C74.3843 17.4176 73.3466 16.3234 71.8041 16.3234C70.2916 16.3234 69.2256 17.5006 69.2256 19.2108V25.8273C69.2256 26.6956 68.7208 27.1721 67.8525 27.1721C66.9559 27.1721 66.5077 26.7521 66.5077 25.8273V19.2108C66.5077 17.4176 65.4487 16.3234 63.9274 16.3234C62.3584 16.3234 61.3489 17.4741 61.3489 19.2108V25.8273C61.3489 26.6956 60.8442 27.1721 60.0041 27.1721C59.134 27.1721 58.6575 26.6956 58.6575 25.8273V15.3704C58.6575 14.5585 58.9663 13.9408 59.8929 13.9408C60.6765 13.9426 61.1248 14.3344 61.266 15.3704Z" fill="currentColor"/>
<path d="M81.8902 20.7532C82.1973 22.9664 83.4786 24.5318 86.036 24.5318C87.1369 24.552 88.206 24.1626 89.0362 23.4394C89.1849 23.2853 89.3635 23.1634 89.5612 23.0812C89.7588 22.9989 89.9712 22.958 90.1852 22.9611C90.5232 22.9662 90.8454 23.1047 91.0818 23.3463C91.3182 23.588 91.4495 23.9132 91.4471 24.2512C91.4471 25.5413 89.1757 27.1668 85.953 27.1668C85.0553 27.1699 84.1659 26.9949 83.3362 26.6519C82.5066 26.309 81.7532 25.8049 81.1197 25.1689C80.4861 24.5329 79.985 23.7776 79.6453 22.9466C79.3056 22.1157 79.134 21.2256 79.1406 20.3279C79.1406 16.431 82.1691 13.459 85.953 13.459C89.8763 13.459 92.3436 16.4875 92.3436 18.9301C92.3436 20.1073 91.6147 20.7532 90.2981 20.7532H81.8902ZM89.6557 18.6777C89.3486 17.0523 87.8908 16.0445 85.9848 16.0445C84.1616 16.0445 82.5362 17.0523 82.0314 18.6777H89.6557Z" fill="currentColor"/>
<path d="M96.9605 15.5936C97.49 14.4729 98.7554 13.6875 100.185 13.6875C101.614 13.6875 103.521 14.4729 103.521 15.8459C103.521 16.6031 103.016 17.2208 102.23 17.2208C101.857 17.2205 101.497 17.0801 101.223 16.8272C100.785 16.4547 100.226 16.2551 99.6519 16.266C97.9135 16.266 96.9887 17.5279 96.9887 19.1816V25.2933C96.9887 26.5288 96.7363 27.1712 95.6439 27.1712C94.6061 27.1712 94.3538 26.5252 94.3538 25.2298V15.4541C94.3538 14.5841 94.7191 14.0246 95.5309 14.0246C96.5122 14.0246 96.7646 14.5011 96.9605 15.5936Z" fill="currentColor"/>
<path d="M107.273 20.7518C107.582 22.965 108.861 24.5357 111.422 24.5357C112.523 24.5559 113.592 24.1666 114.422 23.4433C114.571 23.2893 114.75 23.1675 114.947 23.0852C115.145 23.0029 115.357 22.962 115.571 22.965C115.909 22.9697 116.232 23.108 116.468 23.3497C116.705 23.5915 116.836 23.917 116.833 24.2551C116.833 25.5453 114.563 27.1707 111.339 27.1707C110.441 27.1738 109.552 26.9988 108.722 26.6558C107.893 26.3128 107.14 25.8088 106.506 25.1727C105.873 24.5367 105.372 23.7813 105.032 22.9504C104.693 22.1194 104.521 21.2294 104.528 20.3318C104.528 16.4349 107.555 13.4629 111.339 13.4629C115.264 13.4629 117.73 16.4914 117.73 18.934C117.73 20.1112 117.001 20.7571 115.684 20.7571L107.273 20.7518ZM115.038 18.6763C114.729 17.0509 113.273 16.0431 111.365 16.0431C109.544 16.0431 107.917 17.0509 107.414 18.6763H115.038Z" fill="currentColor"/>
<path d="M122.458 21.7067V25.6865C122.458 26.696 122.009 27.1725 121.113 27.1725C120.188 27.1725 119.74 26.696 119.74 25.6865V8.99954C119.74 7.99003 120.188 7.45703 121.113 7.45703C122.009 7.45703 122.458 7.9865 122.458 8.99954V18.0534L126.746 14.2695C127.02 14.0109 127.379 13.8615 127.756 13.8494C128.513 13.8494 129.101 14.3789 129.101 15.1095C129.094 15.3249 129.037 15.5356 128.935 15.7254C128.833 15.9152 128.689 16.0789 128.513 16.2038L124.111 19.82L129.27 24.7246C129.718 25.1447 129.858 25.51 129.858 25.8735C129.856 26.2099 129.723 26.5323 129.488 26.7729C129.253 27.0136 128.934 27.1536 128.598 27.1637C128.261 27.1637 127.892 27.0225 127.475 26.6342L122.458 21.7067Z" fill="currentColor"/>
<path d="M142.779 13.6615C143.647 13.6615 144.097 14.138 144.097 15.1175V25.4138C144.097 26.5363 143.816 27.0958 142.835 27.0958C141.993 27.0958 141.573 26.4516 141.434 25.1067C140.76 26.3422 138.995 27.1805 137.198 27.1805C133.471 27.1805 130.864 24.1802 130.864 20.3416C130.864 16.4447 133.443 13.4727 137.198 13.4727C139.021 13.4727 140.786 14.2298 141.487 15.6029C141.543 14.6128 141.796 13.6615 142.779 13.6615ZM133.585 20.3327C133.585 22.6589 135.211 24.4802 137.481 24.4802C139.75 24.4802 141.377 22.6589 141.377 20.3327C141.377 18.0896 139.752 16.1835 137.481 16.1835C135.209 16.1835 133.584 18.0896 133.584 20.3327H133.585Z" fill="currentColor"/>
<path d="M38.2606 35.9685C41.9879 35.9685 45.0095 32.9469 45.0095 29.2196C45.0095 25.4923 41.9879 22.4707 38.2606 22.4707C34.5333 22.4707 31.5117 25.4923 31.5117 29.2196C31.5117 32.9469 34.5333 35.9685 38.2606 35.9685Z" fill="currentColor"/>
<path d="M15.7339 18.0012C15.7349 19.5851 16.2929 21.1183 17.3101 22.3324C18.3274 23.5465 19.7392 24.3642 21.2985 24.6425C22.8578 24.9208 24.4653 24.6419 25.8397 23.8547C27.2142 23.0674 28.2681 21.8219 28.8169 20.3361C28.8852 20.0526 28.9675 19.7749 29.064 19.5031C29.6807 17.7426 30.8292 16.2171 32.3506 15.1377C33.872 14.0583 35.6912 13.4783 37.5566 13.4778H37.7225C37.8708 13.4778 38.0173 13.4866 38.1637 13.4955H38.2308C39.4713 13.4954 40.6877 13.1535 41.7466 12.5074C42.8055 11.8613 43.6659 10.9359 44.2333 9.83288C44.8008 8.72982 45.0533 7.49174 44.9632 6.25457C44.8731 5.01739 44.4439 3.82895 43.7227 2.81973C43.0014 1.81051 42.0161 1.01952 40.8747 0.533617C39.7334 0.0477114 38.4803 -0.114328 37.2529 0.0652887C36.0255 0.244906 34.8714 0.759233 33.9171 1.55181C32.9629 2.34438 32.2455 3.38455 31.8437 4.55812C31.7978 4.73461 31.7449 4.9111 31.6866 5.08758C31.0927 6.88504 29.9473 8.44949 28.4131 9.55846C26.8789 10.6674 25.0341 11.2645 23.1411 11.2647H22.9875C22.8375 11.2647 22.6893 11.2647 22.541 11.247H22.4828C21.5961 11.2472 20.7182 11.4221 19.8991 11.7617C19.0801 12.1013 18.336 12.5989 17.7092 13.2261C17.0825 13.8533 16.5855 14.5978 16.2466 15.4172C15.9076 16.2365 15.7334 17.1145 15.7339 18.0012Z" fill="currentColor"/>
<path d="M29.2475 18.0012C29.2464 19.5851 28.6885 21.1183 27.6712 22.3324C26.6539 23.5465 25.2422 24.3642 23.6829 24.6425C22.1236 24.9208 20.516 24.6419 19.1416 23.8547C17.7672 23.0674 16.7133 21.8219 16.1644 20.3361C16.0962 20.0526 16.0138 19.7749 15.9173 19.5031C15.3005 17.7423 14.1518 16.2166 12.6301 15.1372C11.1083 14.0578 9.28869 13.4779 7.42297 13.4778H7.25707C7.10882 13.4778 6.96233 13.4866 6.81761 13.4955H6.74878C5.50812 13.4956 4.29141 13.1539 3.23228 12.5077C2.17315 11.8616 1.31256 10.9361 0.745029 9.83285C0.177496 8.72961 -0.0750281 7.4913 0.0151883 6.25392C0.105405 5.01655 0.534872 3.82796 1.25643 2.8187C1.97798 1.80945 2.96371 1.01855 4.10536 0.532882C5.24701 0.0472112 6.50042 -0.11445 7.72794 0.0656506C8.95546 0.245752 10.1096 0.760649 11.0636 1.5538C12.0177 2.34694 12.7347 3.38766 13.1359 4.56165C13.1835 4.73814 13.2365 4.91463 13.2947 5.09111C13.8885 6.88828 15.0337 8.45253 16.5676 9.56147C18.1014 10.6704 19.9458 11.2676 21.8385 11.2682H21.9938C22.1421 11.2682 22.2921 11.2682 22.4386 11.2505H22.4968C23.3833 11.2505 24.2611 11.4252 25.0802 11.7644C25.8992 12.1037 26.6434 12.6009 27.2702 13.2278C27.8971 13.8546 28.3943 14.5988 28.7336 15.4178C29.0728 16.2369 29.2475 17.1147 29.2475 18.0012Z" fill="currentColor"/>
<path d="M11.5952 24.5301C12.5234 25.48 13.1508 26.6827 13.3986 27.9876C13.6464 29.2924 13.5037 30.6414 12.9884 31.8655C12.4731 33.0896 11.608 34.1345 10.5015 34.8692C9.39506 35.6039 8.09642 35.9958 6.76824 35.9958C5.44007 35.9958 4.14142 35.6039 3.03496 34.8692C1.9285 34.1345 1.06342 33.0896 0.548082 31.8655C0.0327398 30.6414 -0.109953 29.2924 0.137877 27.9876C0.385706 26.6827 1.01304 25.48 1.9413 24.5301C2.0166 24.4595 2.09073 24.3871 2.16367 24.313C3.82308 22.6313 4.75162 20.3626 4.74746 18C4.75056 15.6348 3.8194 13.364 2.15661 11.6818L1.9413 11.47C1.01244 10.5199 0.384581 9.31692 0.136396 8.01163C-0.111789 6.70634 0.0307323 5.35683 0.546105 4.13218C1.06148 2.90753 1.92678 1.8622 3.03361 1.12714C4.14044 0.392089 5.43957 0 6.76824 0C8.09692 0 9.39605 0.392089 10.5029 1.12714C11.6097 1.8622 12.475 2.90753 12.9904 4.13218C13.5058 5.35683 13.6483 6.70634 13.4001 8.01163C13.1519 9.31692 12.5241 10.5199 11.5952 11.47L11.371 11.6818C9.71174 13.3658 8.7816 15.635 8.7816 17.9992C8.7816 20.3633 9.71174 22.6325 11.371 24.3165C11.4452 24.3907 11.5175 24.463 11.5934 24.5336L11.5952 24.5301Z" fill="currentColor"/>
</svg>`;

function topNav({active="dashboard"}={}){
  const item = (k,label,href)=>`<a class="nav-link" href="${href}" ${k===active?'style="color:#0F172A;font-weight:600"':''}>${label}</a>`;
  return `<header class="topnav"><div class="topnav-inner">
    <a href="../index.html" class="brand-mark">${MEREKA_LOGO_SVG}</a>
    <nav style="display:flex;gap:22px">
      ${item("experts","Find experts","../web/find-experts.html")}
      ${item("gigs","Find gigs","../web/find-gigs.html")}
      ${item("learn","Learn","../web/learn.html")}
      ${item("workspace","Workspace","../user/overview.html")}
      ${item("why","Why Mereka","../web/about.html")}
    </nav>
    <div class="nav-search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input placeholder="What are you looking for?"/></div>
    <div style="display:flex;align-items:center;gap:12px">
      <a href="../user/overview.html" class="btn btn-pink" style="border-radius:999px;padding:8px 16px">My Dashboard</a>
      <button class="btn" style="width:32px;height:32px;padding:0;justify-content:center;border-radius:999px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></button>
      <div class="avatar"></div>
    </div>
  </div></header>`;
}

const USER_MENU = [
  {section:null, items:[
    {key:"overview", label:"Account Details", icon:"user", href:"overview.html"},
  ]},
  {section:"BOOKINGS", items:[
    {key:"bookings", label:"My Bookings", icon:"calendar", href:"bookings.html"},
    {key:"transactions", label:"Transactions", icon:"receipt", href:"transactions.html"},
  ]},
  {section:"LEARNING", items:[
    {key:"courses", label:"My Courses", icon:"book", href:"courses.html"},
    {key:"interests", label:"Interests", icon:"heart", href:"interests.html"},
  ]},
  {section:"COMMUNICATION", items:[
    {key:"chats", label:"Chats", icon:"chat", href:"chats.html"},
    {key:"reviews", label:"Reviews", icon:"star", href:"reviews.html", badge:3},
    {key:"notifications", label:"Notifications", icon:"bell", href:"notifications.html"},
  ]},
  {section:"ACCOUNT", items:[
    {key:"billing", label:"Billing", icon:"card", href:"billing.html"},
    {key:"favorites", label:"Favourites", icon:"heart", href:"favorites.html"},
    {key:"notification-settings", label:"Notification Settings", icon:"settings", href:"notification-settings.html"},
    {key:"comm-logs", label:"Communication Logs", icon:"mail", href:"communication-logs.html"},
  ]},
];

function userSidebar(active){
  return `<aside class="user-side">
    <div class="user-profile">
      <div class="avatar-lg">FA</div>
      <div>
        <div class="pname">Faiz Aminuddin</div>
        <div class="pemail">faiz@mereka.io</div>
      </div>
    </div>
    ${USER_MENU.map(g=>`
      ${g.section?`<div class="user-section-title">${g.section}</div>`:''}
      <div class="user-menu">${g.items.map(i=>`
        <a href="${i.href}" class="${i.key===active?'active':''}">
          <span style="width:20px;display:inline-flex;justify-content:center">${ICON(i.icon)}</span>
          ${i.label}
          ${i.badge?`<span class="badge">${i.badge}</span>`:''}
        </a>`).join('')}</div>
    `).join('')}
    <div style="margin-top:24px;border-top:1px solid #DDDDDE;padding-top:16px">
      <div class="user-menu">
        <a href="../auth/login.html"><span style="width:20px;display:inline-flex;justify-content:center">${ICON("logout")}</span>Log out</a>
      </div>
    </div>
  </aside>`;
}

const HUB_MENU = [
  {key:"overview", label:"Dashboard", href:"overview.html"},
  {key:"calendar", label:"Calendar", href:"calendar.html"},
  {key:"bookings", label:"Bookings", href:"bookings.html"},
  {key:"chats", label:"Chats", href:"chats.html"},
  {key:"analytics", label:"Analytics", href:"analytics.html"},
];
const HUB_MANAGE = [
  {key:"experiences", label:"Manage Experiences", href:"services-experiences.html"},
  {key:"expertise", label:"Manage Expertise", href:"services-expertise.html"},
  {key:"jobs", label:"Manage Jobs", href:"jobs.html"},
];
const HUB_SETTINGS = [
  {key:"settings", label:"Account Settings", href:"settings.html"},
  {key:"members", label:"Team Members", href:"settings-members.html"},
  {key:"transactions", label:"Transactions", href:"settings-transactions.html"},
  {key:"subscription", label:"Subscription", href:"settings-subscription.html"},
];

function hubSidebar(active){
  const link = (i)=>`<a href="${i.href}" class="${i.key===active?'active':''}">${i.label}</a>`;
  return `<aside class="hub-side">
    <div class="hub-card">
      <div class="hub-profile-row">
        <div class="avatar-lg" style="width:48px;height:48px;font-size:16px;background:linear-gradient(135deg,#F59E0B,#E5397B)">PJ</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:12px;color:#64748B">Hub</span><span style="font-size:10px;font-weight:700;color:#fff;background:#0F172A;padding:2px 7px;border-radius:4px">PRO</span></div>
          <h3 style="font-weight:600;font-size:16px">Penang Jobsearch Hub</h3>
        </div>
      </div>
      <div class="hub-progress"><div class="fill" style="width:78%"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center"><a href="settings.html" style="font-size:13px;color:var(--brand-pink);font-weight:500">Complete your profile</a><span style="font-size:13px;font-weight:600">78%</span></div>
      <div class="hub-stats">
        <div class="hub-stat"><span style="color:#64748B">Overall rating</span><span style="font-weight:500">★ 4.7</span></div>
        <div class="hub-stat"><span style="color:#64748B">Total reviews</span><span style="font-weight:500">128</span></div>
        <div class="hub-stat"><span style="color:#64748B">Response rate</span><span style="font-weight:500">96%</span></div>
      </div>
    </div>
    <div class="hub-card" style="padding:14px">
      <nav class="hub-nav" style="display:flex;flex-direction:column;gap:2px">
        ${HUB_MENU.map(link).join('')}
      </nav>
      <div class="hub-section-divider"></div>
      <nav class="hub-nav" style="display:flex;flex-direction:column;gap:2px">
        ${HUB_MANAGE.map(link).join('')}
      </nav>
      <div class="hub-section-divider"></div>
      <nav class="hub-nav" style="display:flex;flex-direction:column;gap:2px">
        ${HUB_SETTINGS.map(link).join('')}
      </nav>
    </div>
    <div class="hub-card">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">Quick actions</div>
      <a href="../onboarding/experience-select.html" class="btn" style="width:100%;justify-content:center;margin-bottom:6px;border-radius:999px">+ Add experience</a>
      <a href="bookings.html" class="btn" style="width:100%;justify-content:center;border-radius:999px">View bookings</a>
    </div>
  </aside>`;
}

function ICON(name){
  const ic = {
    user:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>`,
    calendar:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    receipt:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2H4z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>`,
    book:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/></svg>`,
    heart:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    chat:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>`,
    star:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    bell:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    card:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
    settings:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    mail:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>`,
    logout:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
  };
  return ic[name]||'';
}

function injectShell(){
  const head = document.head;
  const link = document.createElement('link');
  link.rel='stylesheet'; link.href='../shell/mereka-shell.css';
  head.appendChild(link);
}
