import unittest
from collect import demo_url, image_type, parse, select_cover


class ReferenceIdentityTests(unittest.TestCase):
    def test_related_card_cannot_become_the_requested_title(self):
        page = parse(b'<img alt="Gems Crown Charging Wilds" src="https://cdn.prod.website-files.com/other.webp">')
        self.assertIsNone(select_cover(page.images, "Multi Fruits Charging Wilds"))

    def test_placeholder_does_not_hide_valid_gallery_art(self):
        page = parse(b'<img alt="Samurai" class="w-dyn-bind-empty" src="https://cdn.prod.website-files.com/placeholder.svg">'
                     b'<img alt="Samurai" src="https://cdn.prod.website-files.com/Samurai.webp">')
        self.assertEqual(select_cover(page.images, "Samurai"), "https://cdn.prod.website-files.com/Samurai.webp")

    def test_image_extension_does_not_establish_image_content(self):
        with self.assertRaises(ValueError):
            image_type(b'<html>not an image</html>')

    def test_launcher_repairs_retain_exact_game_identity(self):
        query = '?GameCategory=Slots&GameName=BookOfBonanza&Token=DEMO&PortalName=DEMO'
        self.assertEqual(demo_url('eu-server.ssgportal.com/GameLauncher/Loader.aspx' + query),
                         'https://eu-server.ssgportal.com/GameLauncher/Loader.aspx' + query)
        self.assertEqual(demo_url('http://eu-server.ssgportal.com/GameLauncher/loader.aspx' + query),
                         'https://eu-server.ssgportal.com/GameLauncher/loader.aspx' + query)
        wrapped = 'https://www.google.com/url?q=https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory%3DSlots%26GameName%3DMultiHot10%26Token%3DDEMO%26PortalName%3Ddemo&sa=D'
        self.assertEqual(demo_url(wrapped), 'https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot10&Token=DEMO&PortalName=demo')

    def test_live_tokens_and_other_hosts_are_rejected(self):
        for url in [
            'https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName=PopX&Token=real-session',
            'https://other.test/GameLauncher/Loader.aspx?GameName=PopX&Token=DEMO',
            'https://eu-server.ssgportal.com/wager?GameName=PopX&Token=DEMO',
        ]:
            self.assertIsNone(demo_url(url))


if __name__ == '__main__':
    unittest.main()
