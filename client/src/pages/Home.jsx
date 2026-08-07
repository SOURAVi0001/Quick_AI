import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FeatureShowcase from '../components/FeatureShowcase';
import AiTools from '../components/AiTools';
import Testimonial from '../components/Testimonial';
import Plan from '../components/Plan';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <FeatureShowcase />
      <AiTools />
      <Testimonial />
      <Plan />
      <Footer />
    </>
  );
};

export default Home;
