"""
Monkey patch para solucionar el problema de bcrypt con passlib
"""
import bcrypt

# Añadir el atributo __about__ que passlib espera
if not hasattr(bcrypt, '__about__'):
    class About:
        __version__ = bcrypt.__version__
    bcrypt.__about__ = About()
