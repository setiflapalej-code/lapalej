import re

file_path = "/home/zizo/Desktop/Lapaleg/AlManr_frontend/components/admin-dashboard.tsx"

with open(file_path, "r") as f:
    content = f.read()

# Replace sidebar layout
old_sidebar = """  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar */}
      <div className="fixed right-0 bottom-0 md:top-0 w-full md:h-full md:w-64 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg border-t md:border-t-0 md:border-l border-gray-200 z-50 flex flex-col overflow-hidden">
        <div className="hidden md:block p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-amber-600">لوحة التحكم</h1>
          <p className="text-sm text-gray-600">الرابطة الولائية</p>
        </div>

        <nav className="flex-1 flex overflow-x-auto md:overflow-y-auto md:flex-col p-2 md:p-4 gap-2 md:gap-0 md:space-y-2 items-center md:items-stretch no-scrollbar">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={`flex-shrink-0 md:w-full justify-center md:justify-start ${activeSection === item.id ? "bg-amber-600 hover:bg-amber-700 text-white" : "hover:bg-gray-100"
                  }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className="md:ml-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            )
          })}

          <div className="flex-shrink-0 pt-0 md:pt-4 border-l md:border-l-0 md:border-t border-gray-200 md:mt-4 pl-2 md:pl-0">
            <Button
              variant="ghost"
              className="w-full justify-center md:justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="md:ml-2 h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden md:inline">تسجيل الخروج</span>
            </Button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-auto md:flex-1 md:mr-64 p-4 md:p-6 mb-16 md:mb-0 overflow-x-hidden min-w-0">"""

new_sidebar = """  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar */}
      <div className="fixed right-0 bottom-0 md:top-0 w-full md:h-full md:w-64 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg border-t md:border-t-0 md:border-l border-gray-200 z-50 flex flex-col overflow-hidden">
        <div className="hidden md:block p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-amber-600">لوحة التحكم</h1>
          <p className="text-sm text-gray-600">الرابطة الولائية</p>
        </div>

        <nav className="flex-1 flex overflow-x-auto md:overflow-y-auto md:flex-col p-2 md:p-4 gap-2 md:gap-0 md:space-y-2 items-center md:items-stretch [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={`flex-shrink-0 md:w-full justify-center md:justify-start ${activeSection === item.id ? "bg-amber-600 hover:bg-amber-700 text-white" : "hover:bg-gray-100"
                  }`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className="md:ml-2 h-5 w-5 md:h-4 md:w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            )
          })}

          <div className="flex-shrink-0 pt-0 md:pt-4 border-l md:border-l-0 md:border-t border-gray-200 md:mt-4 pl-2 md:pl-0">
            <Button
              variant="ghost"
              className="w-full justify-center md:justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="md:ml-2 h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden md:inline">تسجيل الخروج</span>
            </Button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-auto md:flex-1 md:mr-64 p-4 md:p-6 mb-20 md:mb-0 overflow-x-hidden min-w-0">"""

content = content.replace(old_sidebar, new_sidebar)

with open(file_path, "w") as f:
    f.write(content)

print("Refined sidebar and scrollbar")
