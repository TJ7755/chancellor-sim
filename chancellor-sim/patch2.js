const fs = require('fs');
let code = fs.readFileSync('src/dashboard.tsx', 'utf8');

const analysisBox = `      <div className="hm-panel-compact text-center flex flex-col justify-center bg-gray-50 border-dashed border-2 border-gray-300">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Detailed Analysis</h3>
        <div className="text-xs text-gray-600 px-2">
          View full economic, fiscal, political and market data in the Analysis tab.
        </div>
      </div>`;

code = code.replace(
  '<div className="text-xs text-gray-500">\n          Current Bank Rate\n        </div>\n      </div>\n    </div>',
  '<div className="text-xs text-gray-500">\n          Current Bank Rate\n        </div>\n      </div>\n\n' + analysisBox + '\n    </div>'
);
fs.writeFileSync('src/dashboard.tsx', code);
