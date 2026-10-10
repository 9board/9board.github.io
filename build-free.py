from pathlib import Path
root = Path(__file__).parent
source = (root/'Billiards_layout_mobile/index.html').read_text(encoding='utf-8')
source = source.replace('<head>', '<head><base href="/Billiards_layout_mobile/">', 1)
source = source.replace("location.replace('/mobile/'+", "location.replace('/mobile/free/'+", 1)
source = source.replace('plus-config.js?v=20261001', 'plus-config.js?v=20261010-free1').replace('plus-services.js?v=20261009-settings-account-row', 'plus-services.js?v=20261010-free1')
destination = root/'mobile/free'
destination.mkdir(parents=True, exist_ok=True)
(destination/'app.html').write_text(source, encoding='utf-8')
wrapper = (root/'mobile/index.html').read_text(encoding='utf-8')
wrapper = wrapper.replace('9BOARD スマホ版', '9BOARD スマホ完全無料版').replace('/Billiards_layout_mobile/', '/mobile/free/app.html')
(destination/'index.html').write_text(wrapper, encoding='utf-8')
